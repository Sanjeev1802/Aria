import { CognitoJwtVerifier } from "aws-jwt-verify";
import { assertCognitoConfigured, cognitoEnv } from "./cognito-env";

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  assertCognitoConfigured();
  const userPoolId = cognitoEnv.userPoolId;
  const clientId = cognitoEnv.clientId;
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: "id",
      clientId,
    });
  }
  return verifier;
}

export type CognitoIdToken = {
  sub: string;
  email?: string;
  name?: string;
  "cognito:username"?: string;
};

export async function verifyIdToken(token: string): Promise<CognitoIdToken> {
  const payload = await getVerifier().verify(token);
  return payload as CognitoIdToken;
}

export function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function readSessionCookie(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)aria_id_token=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function readRequestToken(request: Request) {
  return readBearerToken(request) ?? readSessionCookie(request);
}
