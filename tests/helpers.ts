import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { MemoryStore } from "../lib/server/store/memory-store";
import { AccountDirectory, type Identity } from "../lib/server/accounts/directory";
import { CreditLedger } from "../lib/server/accounting/credit-ledger";
import { buildServices, type ServerConfig, type Services } from "../lib/server/services";
import { cognitoVerifier } from "../lib/server/auth/verifier";
import { cookieNames } from "../lib/server/auth/cookies";
import type { AuthTokens, IdentityProvider } from "../lib/server/auth/cognito";
import { ServiceError } from "../lib/server/errors";

export const POOL = "us-east-1_TestPool1";
export const CLIENT = "test-client-id";
export const ISSUER = `https://cognito-idp.us-east-1.amazonaws.com/${POOL}`;
export const ORIGIN = "https://aria.test";

export function clock(start = Date.UTC(2026, 9, 20, 12)) {
  const c = { now: start, fn: () => c.now, advance(ms: number) { c.now += ms; } };
  return c;
}

export function ledgerEnv(start?: number) {
  const time = clock(start);
  const store = new MemoryStore();
  return { time, store, directory: new AccountDirectory(store, time.fn), ledger: new CreditLedger(store, time.fn) };
}

export function identity(sub: string, extra: Partial<Identity> = {}): Identity {
  return { sub, email: `${sub}@example.com`, emailVerified: true, name: sub, authTime: 1_000, ...extra };
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const attacker = generateKeyPairSync("rsa", { modulusLength: 2048 });
export const JWKS = { keys: [{ ...publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" }] } as never;

const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
export function signJwt(payload: Record<string, unknown>, key: KeyObject = privateKey, kid = "test-key") {
  const data = `${b64({ alg: "RS256", kid, typ: "JWT" })}.${b64(payload)}`;
  return `${data}.${sign("RSA-SHA256", Buffer.from(data), key).toString("base64url")}`;
}
export const attackerKey = attacker.privateKey;

export function tokensFor(sub: string, options: { email?: string; emailVerified?: boolean; authTime?: number; expiresIn?: number;
  clientId?: string; issuer?: string; key?: KeyObject; accessUse?: string } = {}): AuthTokens {
  const now = Math.floor(Date.now() / 1000);
  const authTime = options.authTime ?? now;
  const exp = now + (options.expiresIn ?? 3600);
  const iss = options.issuer ?? ISSUER;
  const clientId = options.clientId ?? CLIENT;
  return {
    accessToken: signJwt({ sub, iss, client_id: clientId, token_use: options.accessUse ?? "access", auth_time: authTime,
      iat: now, exp, jti: `${sub}-${now}`, username: sub, scope: "aws.cognito.signin.user.admin" }, options.key),
    idToken: signJwt({ sub, iss, aud: clientId, token_use: "id", auth_time: authTime, iat: now, exp,
      email: options.email ?? `${sub}@example.com`, email_verified: options.emailVerified ?? true, name: sub }, options.key),
    refreshToken: `refresh-${sub}`,
  };
}

/** Fake Cognito: accepts `password` for any address, issuing tokens signed by the test pool key. */
export class FakeIdp implements IdentityProvider {
  revoked = new Set<string>();
  async signIn(email: string, password: string) {
    if (password !== "correct horse battery") throw new ServiceError("invalid_credentials", 401);
    return tokensFor(email.split("@")[0], { email });
  }
  async signUp() { return { confirmationRequired: true }; }
  async confirmSignUp() {}
  async resendCode() {}
  async forgotPassword() {}
  async confirmForgotPassword() {}
  async refresh(refreshToken: string, subject: string) {
    if (this.revoked.has(refreshToken)) throw new ServiceError("session_revoked", 401);
    const { refreshToken: _unused, ...rest } = tokensFor(subject, { authTime: 1_000 });
    return rest;
  }
  async revoke(refreshToken: string) { this.revoked.add(refreshToken); }
}

export const productionConfig: ServerConfig = {
  environment: "production", region: "us-east-1", cognito: { userPoolId: POOL, clientId: CLIENT },
  table: "aria-test", appOrigin: ORIGIN, localIdentity: false, liveChat: true, secureCookies: true,
};

export function testServices(config: Partial<ServerConfig> = {}): Services & { store: MemoryStore; idp: FakeIdp } {
  const store = new MemoryStore();
  const idp = new FakeIdp();
  const merged = { ...productionConfig, ...config };
  return buildServices(merged, { store, idp, verifier: cognitoVerifier({ userPoolId: POOL, clientId: CLIENT, jwks: JWKS }) }) as never;
}

export function cookieHeader(tokens: Partial<AuthTokens>, secure = true) {
  const names = cookieNames(secure);
  return [tokens.accessToken && `${names.access}=${tokens.accessToken}`, tokens.idToken && `${names.id}=${tokens.idToken}`,
    tokens.refreshToken && `${names.refresh}=${tokens.refreshToken}`].filter(Boolean).join("; ");
}

export function request(path: string, options: { method?: string; body?: unknown; tokens?: Partial<AuthTokens>;
  origin?: string | null; workspace?: string; host?: string } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  if (options.tokens) headers.set("cookie", cookieHeader(options.tokens));
  const origin = options.origin === undefined ? ORIGIN : options.origin;
  if (origin && method !== "GET") headers.set("origin", origin);
  if (options.workspace) headers.set("x-aria-workspace", options.workspace);
  return new Request(`${options.host ?? ORIGIN}${path}`, { method, headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body) });
}

export async function sse(response: Response) {
  const text = await response.text();
  return text.trim().split("\n\n").filter(Boolean).map(line => JSON.parse(line.slice(6)) as Record<string, unknown>);
}
