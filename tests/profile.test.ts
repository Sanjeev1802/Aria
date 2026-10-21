import test from "node:test";
import assert from "node:assert/strict";
import { profilePatchHandler } from "../lib/server/profile";
import { run, sessionHandler } from "../lib/server/handlers";
import { request, testServices, tokensFor } from "./helpers";

function pngAvatar() {
  const bytes = Buffer.alloc(33);
  Buffer.from("89504e470d0a1a0a", "hex").copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(128, 16);
  bytes.writeUInt32BE(128, 20);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

test("signed-in user edits their own name and avatar; the saved profile survives session reload", async () => {
  const services = testServices();
  const alice = tokensFor("alice");
  const bob = tokensFor("bob");
  const first = await run(request("/api/auth/session/", { tokens: alice }), sessionHandler, services);
  assert.equal(first.status, 200);
  const updated = await run(request("/api/profile/", { method: "PATCH", tokens: alice,
    body: { name: "  Alice  Example  ", avatar: pngAvatar() } }), profilePatchHandler, services);
  assert.equal(updated.status, 200);
  const changed = await updated.json();
  assert.equal(changed.user.name, "Alice Example");
  assert.equal(changed.user.avatar, pngAvatar());
  assert.equal("avatar" in (await services.directory.getUser("alice"))!, false);
  const aliceSession = await (await run(request("/api/auth/session/", { tokens: alice }), sessionHandler, services)).json();
  assert.equal(aliceSession.user.name, "Alice Example");
  assert.equal(aliceSession.user.avatar, pngAvatar());
  const bobSession = await (await run(request("/api/auth/session/", { tokens: bob }), sessionHandler, services)).json();
  assert.equal(bobSession.user.name, "bob");
  assert.equal(bobSession.user.avatar, null);
  const removed = await run(request("/api/profile/", { method: "PATCH", tokens: alice, body: { avatar: null } }), profilePatchHandler, services);
  assert.equal(removed.status, 200);
  assert.equal((await removed.json()).user.avatar, null);
});

test("profile updates reject malformed names, unsafe images, missing identity, and cross-site writes", async () => {
  const services = testServices();
  const alice = tokensFor("alice");
  for (const body of [{ name: " " }, { name: "x".repeat(81) }, { avatar: "https://example.com/photo.png" },
    { avatar: "data:image/svg+xml;base64,PHN2Zz4=" }, { avatar: "data:image/png;base64,aGVsbG8=" }, {}]) {
    const response = await run(request("/api/profile/", { method: "PATCH", tokens: alice, body }), profilePatchHandler, services);
    assert.equal(response.status, 400);
  }
  const anonymous = await run(request("/api/profile/", { method: "PATCH", body: { name: "Fake" } }), profilePatchHandler, services);
  assert.equal(anonymous.status, 401);
  const crossSite = await run(request("/api/profile/", { method: "PATCH", tokens: alice,
    origin: "https://elsewhere.example", body: { name: "Fake" } }), profilePatchHandler, services);
  assert.equal(crossSite.status, 403);
});
