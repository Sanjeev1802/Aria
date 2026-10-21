import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../lib/server/store/memory-store";
import { buildServices } from "../lib/server/services";
import { adminCustomer, adminOverview, executeAdminAction, parseAdminAction, requireInternalAdmin } from "../lib/server/admin";

const config = { environment: "development" as const, region: "us-east-1", localIdentity: true,
  liveChat: false, secureCookies: false, adminLocalDev: true };

function request(slot: "alex" | "blair" = "alex", method = "GET", origin = "http://127.0.0.1:3000") {
  return new Request("http://127.0.0.1:3000/api/admin/overview/", { method,
    headers: { "x-aria-local-user": slot, ...(method !== "GET" ? { origin } : {}) } });
}

test("internal console denies customer roles and local preview requires explicit loopback setup", async () => {
  const store = new MemoryStore();
  const services = buildServices(config, { store });
  await assert.rejects(requireInternalAdmin(request("blair"), services), { code: "admin_access_denied" });
  await assert.rejects(requireInternalAdmin(request("alex"), buildServices({ ...config, adminLocalDev: false }, { store })),
    { code: "admin_access_denied" });
  await assert.rejects(requireInternalAdmin(request("alex", "POST", "https://other.example"), services),
    { code: "invalid_origin" });
  const remote = new Request("https://aria.example/api/admin/overview/", { headers: { "x-aria-local-user": "alex" } });
  await assert.rejects(requireInternalAdmin(remote, services), { code: "local_development_only" });
  assert.equal((await requireInternalAdmin(request("alex"), services)).user.id, "local-alex");
});

test("production operator access requires a verified subject on the server allowlist", async () => {
  const store = new MemoryStore();
  const identity = { sub: "cognito-admin-1", email: "operator@example.com", name: "Operator",
    emailVerified: true, authTime: 1 };
  const verifier = { verify: async () => identity };
  const base = { ...config, environment: "production" as const, localIdentity: false, adminLocalDev: true,
    secureCookies: true };
  const req = new Request("https://aria.example/api/admin/overview/", {
    headers: { cookie: "__Host-aria_at=access; __Host-aria_id=id", "x-aria-admin": "true" },
  });
  await assert.rejects(requireInternalAdmin(req, buildServices({ ...base, adminSubjects: [] }, { store, verifier })),
    { code: "admin_access_denied" });
  const allowed = buildServices({ ...base, adminSubjects: [identity.sub] }, { store, verifier });
  assert.equal((await requireInternalAdmin(req, allowed)).user.id, identity.sub);
});

test("operator dashboard reads indexed customer data without exposing chat content", async () => {
  const store = new MemoryStore();
  const services = buildServices(config, { store });
  await requireInternalAdmin(request("alex"), services);
  const blair = await services.directory.ensureAccount({ sub: "local-blair", email: "blair@localhost.test", name: "Blair",
    emailVerified: true, authTime: 1 });
  await services.ledger.ensurePeriodGrant(blair.personalWorkspaceId, "free");
  const overview = await adminOverview(services);
  assert.equal(overview.summary.users, 2);
  assert.equal(overview.summary.workspaces, 2);
  assert.ok(overview.users.every(user => !Object.hasOwn(user, "sessionsRevokedAfter")));
  const detail = await adminCustomer(services, blair.id);
  assert.equal(detail.workspaces[0].credits.included, 200);
  assert.equal(detail.user.email, "blair@localhost.test");
});

test("operator actions are auditable and idempotent; downgrade respects occupied seats", async () => {
  const store = new MemoryStore();
  const services = buildServices(config, { store });
  await requireInternalAdmin(request("alex"), services);
  const blair = await services.directory.ensureAccount({ sub: "local-blair", email: "blair@localhost.test", name: "Blair",
    emailVerified: true, authTime: 1 });
  const action = parseAdminAction({ id: "action-1", type: "disable_user", targetId: blair.id, reason: "Requested by support" });
  assert.deepEqual(await executeAdminAction(services, "local-alex", action), { result: "applied" });
  assert.deepEqual(await executeAdminAction(services, "local-alex", action), { result: "duplicate" });
  assert.equal((await services.directory.getUser(blair.id))?.status, "disabled");
  assert.equal((await adminOverview(services)).activity[0].reason, "Requested by support");
  await assert.rejects(executeAdminAction(services, "local-alex", { ...action, reason: "Different reason" }),
    { code: "admin_action_conflict" });
  await assert.rejects(executeAdminAction(services, "local-alex", { ...action, id: "action-2", targetId: "local-alex" }),
    { code: "admin_self_action" });
  assert.throws(() => parseAdminAction({ id: "short", type: "enable_user", targetId: blair.id, reason: "x" }),
    { code: "admin_invalid_action" });

  const upgrade = parseAdminAction({ id: "plan-1", type: "set_plan", targetId: blair.personalWorkspaceId,
    plan: "team", reason: "Approved plan test" });
  assert.deepEqual(await executeAdminAction(services, "local-alex", upgrade), { result: "applied" });
  assert.equal((await services.directory.getWorkspace(blair.personalWorkspaceId))?.plan, "team");
  assert.equal((await services.ledger.balance(blair.personalWorkspaceId)).included, 20_000);
  assert.deepEqual(await executeAdminAction(services, "local-alex", upgrade), { result: "duplicate" });
  const invite = await services.directory.invite({ workspaceId: blair.personalWorkspaceId, userId: blair.id,
    role: "owner", email: blair.email, name: blair.name }, "member@example.com");
  assert.ok(invite.inviteId);
  await assert.rejects(executeAdminAction(services, "local-alex", { ...upgrade, id: "plan-2", plan: "free" }),
    { code: "admin_plan_seats_exceeded" });
});
