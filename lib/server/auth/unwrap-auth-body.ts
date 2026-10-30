import { isAuthPayloadEnvelope } from "@/lib/auth/auth-payload-format";
import { ServiceError } from "../errors";
import { decryptAuthPayload } from "./auth-payload-crypto";

/** Merges decrypted auth fields into the request body when an envelope is present. */
export function unwrapAuthBody(body: Record<string, unknown>, key: Buffer | undefined): Record<string, unknown> {
  if (!isAuthPayloadEnvelope(body)) return body;
  if (!key) throw new ServiceError("live_service_not_configured", 503);
  const inner = decryptAuthPayload(key, body.payload);
  return { ...body, ...inner };
}
