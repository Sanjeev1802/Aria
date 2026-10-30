/** Auth POST body: encrypted envelope hides email and password from DevTools. */
export type AuthPayloadEnvelope = { v: 1; payload: string };

export function isAuthPayloadEnvelope(body: unknown): body is AuthPayloadEnvelope {
  return Boolean(body && typeof body === "object" && (body as AuthPayloadEnvelope).v === 1
    && typeof (body as AuthPayloadEnvelope).payload === "string");
}
