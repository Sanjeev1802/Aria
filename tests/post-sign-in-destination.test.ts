import test from "node:test";
import assert from "node:assert/strict";
import { resolvePostSignInPath, hasInternalProductAccess } from "../lib/auth/post-sign-in-destination";

test("operators land on internal; customers on chat", () => {
  assert.equal(
    resolvePostSignInPath({ operator: { role: "super_admin", canEdit: true }, user: { globalRole: "super_admin" } }),
    "/internal/",
  );
  assert.equal(
    resolvePostSignInPath({ user: { globalRole: "admin" } }),
    "/internal/",
  );
  assert.equal(
    resolvePostSignInPath({ user: { globalRole: "member" } }),
    "/chat/",
  );
  assert.equal(
    resolvePostSignInPath({ user: { globalRole: "team_admin" } }, "/pricing/"),
    "/pricing/",
  );
  assert.equal(
    resolvePostSignInPath({ user: { globalRole: "member" } }, "/internal/"),
    "/chat/",
  );
});

test("hasInternalProductAccess mirrors session operator and global role", () => {
  assert.equal(hasInternalProductAccess({ operator: { role: "billing", canEdit: false } }), false);
  assert.equal(hasInternalProductAccess({ operator: { role: "super_admin", canEdit: true } }), true);
  assert.equal(hasInternalProductAccess({ user: { globalRole: "team_member" } }), false);
});
