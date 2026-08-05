import { createHmac, timingSafeEqual } from "crypto"
import type { ApiKeyRecord } from "@/lib/api-keys-server"

export type EmbedSessionPayload = {
  keyId: string
  uid: string
  projectName: string
  exp: number
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 8 // 8 hours

function getSecret(): string {
  const secret =
    process.env.ARIA_EMBED_SECRET ||
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (!secret) {
    throw new Error("ARIA_EMBED_SECRET is not configured.")
  }
  return secret
}

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function fromB64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/")
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
  return Buffer.from(padded + pad, "base64")
}

export function createEmbedToken(
  key: ApiKeyRecord,
  ttlSeconds = DEFAULT_TTL_SECONDS
): string {
  const payload: EmbedSessionPayload = {
    keyId: key.id,
    uid: key.uid,
    projectName: key.projectName,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }
  const body = b64url(JSON.stringify(payload))
  const sig = b64url(createHmac("sha256", getSecret()).update(body).digest())
  return `${body}.${sig}`
}

export function verifyEmbedToken(token: string): EmbedSessionPayload | null {
  const [body, sig] = token.split(".")
  if (!body || !sig) return null

  const expected = b64url(
    createHmac("sha256", getSecret()).update(body).digest()
  )
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(
      fromB64url(body).toString("utf8")
    ) as EmbedSessionPayload
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    if (!payload.keyId || !payload.uid) return null
    return payload
  } catch {
    return null
  }
}

export function buildEmbedChatUrl(origin: string, token: string): string {
  const url = new URL("/embed/chat", origin)
  url.searchParams.set("token", token)
  return url.toString()
}
