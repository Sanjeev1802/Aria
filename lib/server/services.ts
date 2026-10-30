import { ServiceError } from "./errors";
import { AccountDirectory } from "./accounts/directory";
import { CreditLedger } from "./accounting/credit-ledger";
import { cognitoVerifier, type IdentityVerifier } from "./auth/verifier";
import { CognitoIdentityProvider, type IdentityProvider } from "./auth/cognito";
import { LocalIdentityProvider } from "./auth/local-identity-provider";
import { join } from "node:path";
import { DynamoStore } from "./store/dynamo-store";
import { SqliteStore } from "./store/sqlite-store";
import type { Store } from "./store/types";
import { createOneWaveInviteSender, type TeamInviteSender } from "./email/onewave";
import { resolveDatabaseUrl } from "./secrets/database-url";
import { LazyUserStore } from "./users/lazy-user-store";
import { createUserStore, PgUserStore, type UserStore } from "./users/user-store";

export type ServerConfig = {
  environment: "development" | "production";
  region: string;
  cognito?: { userPoolId: string; clientId: string; clientSecret?: string };
  table?: string;
  dynamoEndpoint?: string;
  /** Canonical public origin for CSRF checks; required in production. */
  appOrigin?: string;
  /** Development-only loopback identity. Never honored in production. */
  localIdentity: boolean;
  /** SQLite path for development when no DynamoDB table is configured. */
  localStorePath?: string;
  /**
   * Development-stage switch (ARIA_PLAN_SWITCHING=enabled): workspace owners may change
   * their own plan to test every tier. Leave unset in preview, beta, and production,
   * where plans change only through verified billing events.
   */
  planSwitching?: boolean;
  /** Operator switch for model calls once identity and accounting are verified together. */
  liveChat: boolean;
  /** Optional server-side SearXNG endpoint for explicit public-web searches. */
  searxngUrl?: string;
  /**
   * Searches Claude may run per message through Anthropic's web search tool; 0 turns it off.
   * Only active when ANTHROPIC_API_KEY is set. Each search costs about $0.01.
   */
  claudeWebSearchMaxUses?: number;
  /** Optional TLS ElastiCache endpoint for public search (120s) and shared chat FAQ cache (30 days). */
  elasticacheUrl?: string;
  /** OneWave transactional email, configured only on the server. */
  emailService?: { url: string; apiKey: string };
  secureCookies: boolean;
  /** Verified Cognito subjects allowed into the internal operator console. */
  adminSubjects?: string[];
  /** Additional verified subjects with scoped internal roles. */
  adminRoles?: Record<string, "support" | "billing" | "operations">;
  /** Loopback-only preview for local development; grants Alex the operator role. */
  adminLocalDev?: boolean;
  /** Development-only operator emails; super admin with adminLocalDev. */
  adminEmails?: string[];
  /** Base64 32-byte AES key for decrypting browser auth envelopes (server + NEXT_PUBLIC pair). */
  authPayloadKey?: string;
  /** Aurora PostgreSQL connection string for global user roles. */
  databaseUrl?: string;
  /** Secrets Manager ARN holding `{ url }` or `{ username, password, host, port, dbname }`. */
  databaseSecretArn?: string;
};

export type Services = {
  config: ServerConfig;
  store: Store;
  userStore: UserStore;
  directory: AccountDirectory;
  ledger: CreditLedger;
  verifier?: IdentityVerifier;
  idp?: IdentityProvider;
  inviteEmail?: TeamInviteSender;
};

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const environment = env.NODE_ENV === "development" ? "development" : "production";
  const pool = env.ARIA_COGNITO_USER_POOL_ID?.trim();
  const client = env.ARIA_COGNITO_CLIENT_ID?.trim();
  const localIdentity = environment === "development" && env.ARIA_LOCAL_DEV === "true";
  const searchUses = Number(env.ANTHROPIC_WEB_SEARCH_MAX_USES);
  return {
    environment,
    region: env.AWS_REGION || "us-east-1",
    cognito: pool && client ? { userPoolId: pool, clientId: client, clientSecret: env.ARIA_COGNITO_CLIENT_SECRET || undefined } : undefined,
    table: env.ARIA_DYNAMODB_TABLE?.trim() || undefined,
    dynamoEndpoint: environment === "development" ? env.ARIA_DYNAMODB_ENDPOINT || undefined : undefined,
    appOrigin: env.ARIA_APP_ORIGIN?.replace(/\/$/, "") || undefined,
    localIdentity,
    claudeWebSearchMaxUses: localIdentity || !env.ANTHROPIC_API_KEY?.trim() ? 0
      : Number.isInteger(searchUses) && searchUses >= 0 && searchUses <= 5 ? searchUses : 2,
    localStorePath: environment === "development"
      ? (env.ARIA_LOCAL_STORE_PATH?.trim() || join(process.cwd(), ".aria", "local-dev.sqlite"))
      : undefined,
    liveChat: env.ARIA_LIVE_CHAT === "enabled",
    planSwitching: env.ARIA_PLAN_SWITCHING === "enabled",
    searxngUrl: env.ARIA_SEARXNG_URL?.trim() || undefined,
    elasticacheUrl: env.ARIA_ELASTICACHE_URL?.trim() || undefined,
    emailService: env.EMAIL_SERVICE_URL?.trim() && env.EMAIL_SERVICE_API_KEY?.trim()
      ? { url: env.EMAIL_SERVICE_URL.trim(), apiKey: env.EMAIL_SERVICE_API_KEY.trim() } : undefined,
    secureCookies: environment === "production",
    adminSubjects: (env.ARIA_ADMIN_SUBS || "").split(",").map(value => value.trim()).filter(Boolean),
    adminRoles: Object.fromEntries((env.ARIA_ADMIN_ROLES || "").split(",").map(entry => entry.trim().split(":"))
      .filter((parts): parts is [string, "support" | "billing" | "operations"] =>
        parts.length === 2 && Boolean(parts[0]) && ["support", "billing", "operations"].includes(parts[1]))),
    adminLocalDev: environment === "development" && env.ARIA_ADMIN_LOCAL_DEV === "true",
    adminEmails: environment === "development"
      ? (env.ARIA_ADMIN_EMAILS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean)
      : undefined,
    databaseUrl: env.ARIA_DATABASE_URL?.trim() || undefined,
    databaseSecretArn: env.ARIA_DATABASE_SECRET_ARN?.trim() || undefined,
    authPayloadKey: env.ARIA_AUTH_PAYLOAD_KEY?.trim() || undefined,
  };
}

function buildUserStore(config: ServerConfig, overrides?: UserStore): UserStore {
  if (overrides) return overrides;
  if (config.databaseUrl) return new PgUserStore(config.databaseUrl);
  if (config.databaseSecretArn) {
    return new LazyUserStore(
      () => resolveDatabaseUrl({ ...process.env, ARIA_DATABASE_SECRET_ARN: config.databaseSecretArn }),
      config.environment === "development" ? config.localStorePath : undefined,
    );
  }
  return createUserStore({
    databaseUrl: undefined,
    sqlitePath: config.localStorePath,
  });
}

/** Throws unless identity and a shared ledger are both configured for this environment. */
export function assertAccountsConfigured(config: ServerConfig) {
  if (config.environment === "production") {
    if (!config.cognito || !config.table || !config.appOrigin) throw new ServiceError("live_service_not_configured", 503);
    return;
  }
  if (!config.cognito && !config.localIdentity) throw new ServiceError("live_service_not_configured", 503);
}

/** Model calls additionally require the explicit operator switch (local dev identity implies it). */
export function assertChatEnabled(config: ServerConfig) {
  assertAccountsConfigured(config);
  if (!config.liveChat && !config.localIdentity) throw new ServiceError("live_service_not_configured", 503);
}

let cached: { key: string; services: Services } | undefined;
let developmentStore: Store | undefined;
export function buildServices(config: ServerConfig, overrides: Partial<Services> = {}): Services {
  let store = overrides.store;
  if (!store) {
    if (config.table) store = new DynamoStore(config.table, { region: config.region, endpoint: config.dynamoEndpoint });
    else if (config.environment === "development") store = developmentStore ??= new SqliteStore(config.localStorePath!);
    else throw new ServiceError("live_service_not_configured", 503);
  }
  const userStore = buildUserStore(config, overrides.userStore);
  return {
    config, store, userStore,
    directory: overrides.directory ?? new AccountDirectory(store, Date.now, undefined, userStore),
    ledger: overrides.ledger ?? new CreditLedger(store),
    verifier: overrides.verifier ?? (config.localIdentity
      ? undefined
      : config.cognito
        ? cognitoVerifier(config.cognito)
        : undefined),
    idp: overrides.idp ?? (config.localIdentity
      ? new LocalIdentityProvider(store)
      : config.cognito
        ? new CognitoIdentityProvider({ region: config.region, ...config.cognito })
        : undefined),
    inviteEmail: overrides.inviteEmail ?? (config.emailService
      ? createOneWaveInviteSender(config.emailService.url, config.emailService.apiKey)
      : undefined),
  };
}

export function getServices(): Services {
  const config = readConfig();
  assertAccountsConfigured(config);
  const key = JSON.stringify(config);
  if (!cached || cached.key !== key) cached = { key, services: buildServices(config) };
  return cached.services;
}
