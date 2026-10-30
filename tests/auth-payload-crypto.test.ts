import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { decryptAuthPayload, encryptAuthPayload } from "../lib/server/auth/auth-payload-crypto";
import { unwrapAuthBody } from "../lib/server/auth/unwrap-auth-body";
import { signInHandler } from "../lib/server/handlers";
import { buildServices } from "../lib/server/services";
import { LocalIdentityProvider } from "../lib/server/auth/local-identity-provider";
import { MemoryStore } from "../lib/server/store/memory-store";

test("auth payload envelope round-trips email and password", () => {
  const key = randomBytes(32);
  const payload = encryptAuthPayload(key, { email: "a@b.co", password: "secret-pass" });
  assert.deepEqual(decryptAuthPayload(key, payload), { email: "a@b.co", password: "secret-pass" });
  const body = unwrapAuthBody({ v: 1, payload }, key);
  assert.equal(body.email, "a@b.co");
  assert.equal(body.password, "secret-pass");
});

test("encrypted sign-in works for local identity with Cognito-style plain password inside", async () => {
  const key = randomBytes(32);
  const keyB64 = key.toString("base64");
  const store = new MemoryStore();
  const services = buildServices({
    environment: "development",
    region: "us-east-1",
    localIdentity: true,
    liveChat: false,
    secureCookies: false,
    authPayloadKey: keyB64,
  }, { store, idp: new LocalIdentityProvider(store) });
  const email = "enc@localhost.test";
  const password = "correct horse battery";
  const { signUpHandler, confirmHandler } = await import("../lib/server/handlers");
  await signUpHandler(new Request("http://127.0.0.1:3000/api/auth/sign-up/", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://127.0.0.1:3000" },
    body: JSON.stringify({ v: 1, payload: encryptAuthPayload(key, { email, password, name: "Enc" }) }),
  }), services);
  await confirmHandler(new Request("http://127.0.0.1:3000/api/auth/confirm/", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://127.0.0.1:3000" },
    body: JSON.stringify({ email, code: "424242" }),
  }), services);
  const signIn = await signInHandler(new Request("http://127.0.0.1:3000/api/auth/sign-in/", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://127.0.0.1:3000" },
    body: JSON.stringify({ v: 1, payload: encryptAuthPayload(key, { email, password }) }),
  }), services);
  assert.equal(signIn.status, 200);
});
