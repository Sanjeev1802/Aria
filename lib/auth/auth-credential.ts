import { createHash } from "node:crypto";

/** Normalized email bound into the credential digest (not sent as a separate secret). */
export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function authCredentialMaterial(email: string, password: string) {
  return `${normalizeAuthEmail(email)}\0${password}`;
}

/** Server-side digest; same algorithm as the browser. */
export function computeAuthCredential(email: string, password: string) {
  return createHash("sha256").update(authCredentialMaterial(email, password)).digest("hex");
}

const CREDENTIAL_PATTERN = /^[a-f0-9]{64}$/;

export function isAuthCredential(value: string) {
  return CREDENTIAL_PATTERN.test(value);
}

/** Accepts a hex digest from the client, or derives one from a legacy plain password field (tests/tools only). */
export function readAuthCredential(body: Record<string, unknown>, email: string): string | undefined {
  const raw = body.credential;
  if (typeof raw === "string" && isAuthCredential(raw)) return raw.toLowerCase();
  const password = typeof body.password === "string" ? body.password : undefined;
  if (password && password.length > 0 && password.length <= 256) {
    return computeAuthCredential(email, password);
  }
  return undefined;
}

/** Browser-only: SHA-256 credential for auth POST bodies (never send plain passwords from the UI). */
export async function computeAuthCredentialWeb(email: string, password: string) {
  const data = new TextEncoder().encode(authCredentialMaterial(email, password));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
