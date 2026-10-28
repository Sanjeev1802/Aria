import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Store } from "../store/types";
import { ServiceError } from "../errors";
import type { AuthTokens, IdentityProvider } from "./cognito";

const FIXED: Record<string, string> = {
  "alex@localhost.test": "local-alex",
  "blair@localhost.test": "local-blair",
};

function normalize(email: string) {
  return email.trim().toLowerCase();
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 32);
  const expectedBuf = Buffer.from(expected, "hex");
  if (actual.length !== expectedBuf.length) return false;
  return timingSafeEqual(actual, expectedBuf);
}

function devCode(email: string) {
  return email.endsWith("@localhost.test") ? "424242" : String(100_000 + (createHash("sha256").update(email).digest()[0] % 900_000));
}

/**
 * Development identity backend stored in the shared ledger. Never used in production.
 */
export class LocalIdentityProvider implements IdentityProvider {
  constructor(private store: Store, private newId = () => `local_${randomBytes(8).toString("hex")}`) {}

  private key(email: string) {
    return { pk: `AUTH#${normalize(email)}`, sk: "CRED" };
  }

  private async read(email: string) {
    return this.store.get(this.key(email));
  }

  /**
   * Loopback-only: create or activate a dev operator and sync the password from env allowlist sign-in.
   * Skips email confirmation so internal operators can sign in immediately.
   */
  async ensureDevOperatorAccount(email: string, password: string) {
    if (password.length < 8) throw new ServiceError("weak_password", 400);
    const normalized = normalize(email);
    if (FIXED[normalized]) return;
    const row = await this.read(normalized);
    const name = normalized.split("@")[0] || "Operator";
    if (
      row
      && row.status === "active"
      && typeof row.passwordHash === "string"
      && verifyPassword(password, row.passwordHash)
    ) {
      return;
    }
    if (!row) {
      await this.store.transact([{
        kind: "put", item: {
          pk: this.key(normalized).pk, sk: this.key(normalized).sk,
          sub: this.newId(), email: normalized, name: name.slice(0, 100),
          status: "active", passwordHash: hashPassword(password),
        }, when: [{ field: "pk", op: "notExists" }],
      }]);
      return;
    }
    await this.store.transact([{
      kind: "update", key: this.key(normalized),
      set: { status: "active", passwordHash: hashPassword(password), name: String(row.name ?? name).slice(0, 100) },
      remove: ["confirmCode", "confirmExpiresAt", "resetCode", "resetExpiresAt"],
      when: [{ field: "pk", op: "exists" }],
    }]);
  }

  async signIn(email: string, password: string): Promise<AuthTokens> {
    const normalized = normalize(email);
    if (FIXED[normalized]) {
      if (!password) throw new ServiceError("invalid_credentials", 401);
      return { accessToken: "local", idToken: normalized, refreshToken: "local" };
    }
    const row = await this.read(normalized);
    if (!row || row.status !== "active" || typeof row.passwordHash !== "string") {
      throw new ServiceError("invalid_credentials", 401);
    }
    if (!verifyPassword(password, row.passwordHash)) throw new ServiceError("invalid_credentials", 401);
    return { accessToken: "local", idToken: normalized, refreshToken: "local" };
  }

  async signUp(email: string, password: string, name: string) {
    const normalized = normalize(email);
    if (FIXED[normalized] || await this.read(normalized)) throw new ServiceError("account_exists", 409);
    const code = devCode(normalized);
    await this.store.transact([{
      kind: "put", item: {
        pk: this.key(normalized).pk, sk: this.key(normalized).sk,
        sub: this.newId(), email: normalized, name: name.trim().slice(0, 100) || normalized.split("@")[0],
        status: "pending", passwordHash: hashPassword(password), confirmCode: code,
        confirmExpiresAt: Date.now() + 15 * 60_000,
      }, when: [{ field: "pk", op: "notExists" }],
    }]);
    return { confirmationRequired: true };
  }

  async confirmSignUp(email: string, code: string) {
    const normalized = normalize(email);
    const row = await this.read(normalized);
    if (!row || row.status !== "pending") throw new ServiceError("invalid_code", 400);
    if (String(row.confirmCode) !== code.trim()) throw new ServiceError("invalid_code", 400);
    if (typeof row.confirmExpiresAt !== "number" || row.confirmExpiresAt < Date.now()) throw new ServiceError("invalid_code", 400);
    await this.store.transact([{
      kind: "update", key: this.key(normalized), set: { status: "active" }, remove: ["confirmCode", "confirmExpiresAt"],
      when: [{ field: "status", op: "=", value: "pending" }],
    }]);
  }

  async resendCode(email: string) {
    const normalized = normalize(email);
    const row = await this.read(normalized);
    if (!row || row.status !== "pending") return;
    const code = devCode(normalized);
    await this.store.transact([{
      kind: "update", key: this.key(normalized), set: { confirmCode: code, confirmExpiresAt: Date.now() + 15 * 60_000 },
      when: [{ field: "status", op: "=", value: "pending" }],
    }]);
  }

  async forgotPassword(email: string) {
    const normalized = normalize(email);
    const row = await this.read(normalized);
    if (!row || row.status !== "active") return;
    const code = devCode(normalized);
    const expiresAt = Date.now() + 15 * 60_000;
    await this.store.transact([{
      kind: "update", key: this.key(normalized), set: { resetCode: code, resetExpiresAt: expiresAt },
      when: [{ field: "status", op: "=", value: "active" }],
    }]);
  }

  async confirmForgotPassword(email: string, code: string, password: string) {
    if (password.length < 8) throw new ServiceError("weak_password", 400);
    const normalized = normalize(email);
    const row = await this.read(normalized);
    if (!row || row.status !== "active") throw new ServiceError("invalid_code", 400);
    if (String(row.resetCode) !== code.trim()) throw new ServiceError("invalid_code", 400);
    if (typeof row.resetExpiresAt === "number" && row.resetExpiresAt < Date.now()) {
      throw new ServiceError("invalid_code", 400);
    }
    await this.store.transact([{
      kind: "update", key: this.key(normalized),
      set: { passwordHash: hashPassword(password) }, remove: ["resetCode", "resetExpiresAt"],
      when: [{ field: "status", op: "=", value: "active" }],
    }]);
  }

  async refresh(): Promise<AuthTokens> {
    throw new ServiceError("session_expired", 401);
  }

  async revoke() {}

  async identityForEmail(email: string) {
    const normalized = normalize(email);
    if (FIXED[normalized]) {
      return { sub: FIXED[normalized], email: normalized, emailVerified: true,
        name: normalized.startsWith("alex") ? "Alex Local" : "Blair Local", authTime: Number.MAX_SAFE_INTEGER };
    }
    const row = await this.read(normalized);
    if (!row || row.status !== "active") return undefined;
    return { sub: String(row.sub), email: normalized, emailVerified: true,
      name: String(row.name ?? normalized.split("@")[0]), authTime: Number.MAX_SAFE_INTEGER };
  }
}
