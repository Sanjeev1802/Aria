import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_EXPIRY_DAYS = 7;

type InvitePayload = {
  e: string;
  n: string;
  exp: number;
};

function getSecret() {
  const secret =
    process.env.INVITE_TOKEN_SECRET?.trim() ||
    process.env.ARIA_EMBED_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "Invite tokens require INVITE_TOKEN_SECRET or ARIA_EMBED_SECRET.",
    );
  }
  return secret;
}

function signPayload(payloadB64: string) {
  return createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("base64url");
}

export function createInviteToken(input: {
  email: string;
  name: string;
  expiryDays?: number;
}) {
  const expiryDays = input.expiryDays ?? DEFAULT_EXPIRY_DAYS;
  const payload: InvitePayload = {
    e: input.email.trim().toLowerCase(),
    n: input.name.trim(),
    exp: Math.floor(Date.now() / 1000) + expiryDays * 86400,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

export function verifyInviteToken(token: string) {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = signPayload(payloadB64);
  const actual = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (
    actual.length !== expectedBuf.length ||
    !timingSafeEqual(actual, expectedBuf)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as InvitePayload;
    if (!payload.e || !payload.n || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: payload.e, name: payload.n };
  } catch {
    return null;
  }
}
