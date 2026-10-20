import { CognitoJwtVerifier } from "aws-jwt-verify";
import { JwtExpiredError } from "aws-jwt-verify/error";
import type { Jwks } from "aws-jwt-verify/jwk";
import { ServiceError } from "../errors";
import type { Identity } from "../accounts/directory";

export type SessionTokens = { accessToken?: string; idToken?: string };
export interface IdentityVerifier { verify(tokens: SessionTokens): Promise<Identity> }

/**
 * Verifies Cognito access + ID tokens: RS256 signature against the pool JWKS,
 * issuer, app client, token use, and expiry. Both must name the same subject.
 */
export function cognitoVerifier(options: { userPoolId: string; clientId: string; jwks?: Jwks }): IdentityVerifier {
  const access = CognitoJwtVerifier.create({ userPoolId: options.userPoolId, clientId: options.clientId, tokenUse: "access" });
  const id = CognitoJwtVerifier.create({ userPoolId: options.userPoolId, clientId: options.clientId, tokenUse: "id" });
  if (options.jwks) { access.cacheJwks(options.jwks); id.cacheJwks(options.jwks); }
  return {
    async verify({ accessToken, idToken }) {
      if (!accessToken || !idToken) throw new ServiceError("not_signed_in", 401);
      try {
        const [a, i] = await Promise.all([access.verify(accessToken), id.verify(idToken)]);
        if (a.sub !== i.sub || typeof a.auth_time !== "number") throw new ServiceError("invalid_session", 401);
        const email = typeof i.email === "string" ? i.email : "";
        if (!email) throw new ServiceError("invalid_session", 401);
        return { sub: a.sub, email, emailVerified: i.email_verified === true,
          name: typeof i.name === "string" ? i.name : "", authTime: a.auth_time };
      } catch (error) {
        if (error instanceof ServiceError) throw error;
        if (error instanceof JwtExpiredError) throw new ServiceError("session_expired", 401);
        throw new ServiceError("invalid_session", 401);
      }
    },
  };
}

/** Reads the subject from a token without trusting it (used only to address a refresh call). */
export function unverifiedSubject(token: string | undefined) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.sub === "string" ? payload.sub : undefined;
  } catch { return undefined; }
}
