import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../lib/server/store/memory-store";
import { LocalIdentityProvider } from "../lib/server/auth/local-identity-provider";
import {
  forgotPasswordHandler, resetPasswordHandler, signInHandler, signUpHandler, confirmHandler,
} from "../lib/server/handlers";
import { buildServices } from "../lib/server/services";

const dev = {
  environment: "development" as const,
  region: "us-east-1",
  localIdentity: true,
  liveChat: false,
  secureCookies: false,
};

function post(path: string, body: unknown) {
  return new Request(`http://127.0.0.1:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://127.0.0.1:3000" },
    body: JSON.stringify(body),
  });
}

test("local identity supports sign-up, confirmation, password reset, and sign-in", async () => {
  const store = new MemoryStore();
  const services = buildServices(dev, { store, idp: new LocalIdentityProvider(store) });
  const email = "journey@localhost.test";
  const password = "correct horse battery";
  const next = "new horse battery";

  await signUpHandler(post("/api/auth/sign-up/", { email, password, name: "Journey" }), services);
  await confirmHandler(post("/api/auth/confirm/", { email, code: "424242" }), services);
  const signIn = await signInHandler(post("/api/auth/sign-in/", { email, password }), services);
  assert.equal(signIn.status, 200);

  await forgotPasswordHandler(post("/api/auth/forgot-password/", { email }), services);
  await resetPasswordHandler(post("/api/auth/reset-password/", { email, code: "424242", password: next }), services);
  await assert.rejects(
    () => signInHandler(post("/api/auth/sign-in/", { email, password }), services),
    { code: "invalid_credentials" },
  );
  const again = await signInHandler(post("/api/auth/sign-in/", { email, password: next }), services);
  assert.equal(again.status, 200);
});
