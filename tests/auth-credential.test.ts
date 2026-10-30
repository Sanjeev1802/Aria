import test from "node:test";
import assert from "node:assert/strict";
import { computeAuthCredential, readAuthCredential } from "../lib/auth/auth-credential";

test("auth credential is a stable hex digest bound to email", () => {
  const a = computeAuthCredential("User@Example.com", "secret-pass");
  const b = computeAuthCredential("user@example.com", "secret-pass");
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.notEqual(a, computeAuthCredential("user@example.com", "other-pass"));
});

test("readAuthCredential accepts credential or legacy password for server tests", () => {
  const email = "a@b.co";
  const credential = computeAuthCredential(email, "pw");
  assert.equal(readAuthCredential({ credential }, email), credential);
  assert.equal(readAuthCredential({ password: "pw" }, email), credential);
  assert.equal(readAuthCredential({ email }, email), undefined);
});
