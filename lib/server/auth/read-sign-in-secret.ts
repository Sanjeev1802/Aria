import { readAuthCredential } from "@/lib/auth/auth-credential";
import { ServiceError } from "../errors";

/** Credential digest from the client, or plain password when Cognito requires it. */
export function readSignInSecrets(body: Record<string, unknown>, email: string) {
  const credential = readAuthCredential(body, email);
  const password = typeof body.password === "string" ? body.password.trim() : "";
  return {
    credential,
    /** Plain password when explicitly sent (Cognito / legacy server tools). Never set by the browser UI. */
    password: password.length > 0 && password.length <= 256 ? password : undefined,
  };
}

export function requireLocalCredential(body: Record<string, unknown>, email: string) {
  const { credential } = readSignInSecrets(body, email);
  if (!credential) throw new ServiceError("invalid_credentials", 401);
  return credential;
}

export function requireCognitoPassword(body: Record<string, unknown>, email: string) {
  const { credential, password } = readSignInSecrets(body, email);
  if (password) return password;
  if (credential) throw new ServiceError("auth_payload_not_configured", 503);
  throw new ServiceError("invalid_credentials", 401);
}
