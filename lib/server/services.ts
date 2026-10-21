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
  /** Operator switch for model calls once identity and accounting are verified together. */
  liveChat: boolean;
  /** Optional server-side SearXNG endpoint for explicit public-web searches. */
  searxngUrl?: string;
  /** Optional TLS ElastiCache endpoint for short-lived public search results. */
  elasticacheUrl?: string;
  /** OneWave transactional email, configured only on the server. */
  emailService?: { url: string; apiKey: string };
  secureCookies: boolean;
};

export type Services = {
  config: ServerConfig;
  store: Store;
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
  return {
    environment,
    region: env.AWS_REGION || "us-east-1",
    cognito: pool && client ? { userPoolId: pool, clientId: client, clientSecret: env.ARIA_COGNITO_CLIENT_SECRET || undefined } : undefined,
    table: env.ARIA_DYNAMODB_TABLE?.trim() || undefined,
    dynamoEndpoint: environment === "development" ? env.ARIA_DYNAMODB_ENDPOINT || undefined : undefined,
    appOrigin: env.ARIA_APP_ORIGIN?.replace(/\/$/, "") || undefined,
    localIdentity: environment === "development" && env.ARIA_LOCAL_DEV === "true",
    localStorePath: environment === "development"
      ? (env.ARIA_LOCAL_STORE_PATH?.trim() || join(process.cwd(), ".aria", "local-dev.sqlite"))
      : undefined,
    liveChat: env.ARIA_LIVE_CHAT === "enabled",
    searxngUrl: env.ARIA_SEARXNG_URL?.trim() || undefined,
    elasticacheUrl: env.ARIA_ELASTICACHE_URL?.trim() || undefined,
    emailService: env.EMAIL_SERVICE_URL?.trim() && env.EMAIL_SERVICE_API_KEY?.trim()
      ? { url: env.EMAIL_SERVICE_URL.trim(), apiKey: env.EMAIL_SERVICE_API_KEY.trim() } : undefined,
    secureCookies: environment === "production",
  };
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
  return {
    config, store,
    directory: overrides.directory ?? new AccountDirectory(store),
    ledger: overrides.ledger ?? new CreditLedger(store),
    verifier: overrides.verifier ?? (config.cognito ? cognitoVerifier(config.cognito) : undefined),
    idp: overrides.idp ?? (config.cognito
      ? new CognitoIdentityProvider({ region: config.region, ...config.cognito })
      : config.localIdentity
        ? new LocalIdentityProvider(store)
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
