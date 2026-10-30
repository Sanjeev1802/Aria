import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ServiceError } from "../errors";

export function parseAuthPayloadKey(value: string | undefined): Buffer | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const key = Buffer.from(trimmed, "base64");
  if (key.length !== 32) throw new ServiceError("live_service_not_configured", 503);
  return key;
}

function decodePayload(payload: string) {
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

/** Test and tooling helper matching the browser envelope format. */
export function encryptAuthPayload(key: Buffer, data: Record<string, unknown>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]).toString("base64url");
}

/** Decrypts `{ email, password, ... }` from the browser envelope. */
export function decryptAuthPayload(key: Buffer, payload: string): Record<string, unknown> {
  const raw = decodePayload(payload);
  if (raw.length < 12 + 16 + 1) throw new ServiceError("invalid_auth_request", 400);
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const ciphertext = raw.subarray(12, raw.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  try {
    const json = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new ServiceError("invalid_auth_request", 400);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("invalid_auth_request", 400);
  }
}
