import test from "node:test";
import assert from "node:assert/strict";
import { classifyCognitoError } from "../lib/server/auth/cognito";

test("forgot-password on an unconfirmed user is not a password-policy error", () => {
  const [code, status] = classifyCognitoError({
    name: "InvalidParameterException",
    message: "Cannot reset password for the user as there is no registered/verified email or phone_number",
  });
  assert.equal(code, "password_reset_unavailable");
  assert.equal(status, 400);
});

test("other invalid Cognito parameters stay generic", () => {
  const [code] = classifyCognitoError({
    name: "InvalidParameterException",
    message: "1 validation error detected: Value at 'username' failed to satisfy constraint",
  });
  assert.equal(code, "invalid_auth_request");
});
