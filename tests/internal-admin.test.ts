import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../lib/server/store/memory-store";
import { buildServices } from "../lib/server/services";
import { chatHandler, run, usageHandler } from "../lib/server/handlers";
import { adminCustomer, adminModels, adminOverview, adminUsage, assertAdminActionAllowed, executeAdminAction, grantOperator, hasFullAccess, listOperators, listSuperAdmins, parseAdminAction, requireInternalAdmin, resolveInternalRole, revokeOperator } from "../lib/server/admin";
import { providerOf, readModelUsage, recordModelUse } from "../lib/server/model-usage";
import { INTERNAL_AUDIT_SOURCE_AI_ACCESS } from "../lib/internal-audit-copy";
import { isLocalDevFixtureUserId } from "../lib/local-user-shared";

const adminChat = chatHandler({
  provider: async function* () { yield { text: "ok" }; },
  modelConfig: model => ({ id: `${model}-admin-test`, rates: { input: 0, output: 0, version: "test" } }),
  maxOutputTokens: 32,
});

const config = { environment: "development" as const, region: "us-east-1", localIdentity: true,
  liveChat: false, secureCookies: false, adminLocalDev: true };

function request(slot: "alex" | "blair" = "alex", method = "GET", origin = "http://127.0.0.1:3000") {
  return new Request("http://127.0.0.1:3000/api/admin/overview/", { method,
    headers: { "x-aria-local-user": slot, ...(method !== "GET" ? { origin } : {}) } });
}

function localCustomerRequest(path: string, slot: "blair", options: { method?: string; workspace?: string; body?: unknown } = {}) {
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  const headers = new Headers({ "x-aria-local-user": slot, "content-type": "application/json" });
  if (options.workspace) headers.set("x-aria-workspace", options.workspace);
  if (method !== "GET") headers.set("origin", "http://127.0.0.1:3000");
  return new Request(`http://127.0.0.1:3000${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
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

test("local preview grants Cognito sign-in when the verified email already belongs to an allowlisted operator", async () => {
  const store = new MemoryStore();
  const local = await buildServices(config, { store }).directory.ensureAccount({
    sub: "local_preview_operator", email: "sanjeev@thebinaryholdings.com", name: "Sanjeev",
    emailVerified: true, authTime: 1,
  });
  const identity = { sub: "cognito-operator-1", email: "sanjeev@thebinaryholdings.com", name: "Sanjeev Kumar",
    emailVerified: true, authTime: 2 };
  const verifier = { verify: async () => identity };
  const req = new Request("http://127.0.0.1:3000/api/admin/overview/", {
    headers: { cookie: "aria_at=access; aria_id=id" },
  });
  const denied = buildServices({ ...config, adminSubjects: [local.id], adminLocalDev: false }, { store, verifier });
  await assert.rejects(requireInternalAdmin(req, denied), { code: "admin_access_denied" });
  const allowed = buildServices({ ...config, adminSubjects: [local.id] }, { store, verifier });
  assert.equal((await requireInternalAdmin(req, allowed)).user.id, identity.sub);
  assert.equal((await requireInternalAdmin(req, allowed)).internalRole, "super_admin");
  const other = { ...identity, sub: "cognito-other-1", email: "other@example.com" };
  const otherReq = new Request("http://127.0.0.1:3000/api/admin/overview/", {
    headers: { cookie: "aria_at=access; aria_id=id" },
  });
  await assert.rejects(requireInternalAdmin(otherReq, buildServices({ ...config, adminSubjects: [local.id] },
    { store, verifier: { verify: async () => other } })), { code: "admin_access_denied" });
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
  assert.equal((await requireInternalAdmin(req, allowed)).internalRole, "super_admin");
  const scoped = buildServices({ ...base, adminSubjects: [], adminRoles: { [identity.sub]: "billing" } }, { store, verifier });
  assert.equal((await requireInternalAdmin(req, scoped)).internalRole, "billing");
});

test("scoped operator roles restrict write actions", () => {
  assert.doesNotThrow(() => assertAdminActionAllowed("billing", "set_plan"));
  assert.doesNotThrow(() => assertAdminActionAllowed("billing", "grant_credits"));
  assert.doesNotThrow(() => assertAdminActionAllowed("operations", "revoke_sessions"));
  assert.doesNotThrow(() => assertAdminActionAllowed("operations", "disable_user"));
  assert.throws(() => assertAdminActionAllowed("operations", "enable_user"), { code: "admin_action_forbidden" });
  assert.doesNotThrow(() => assertAdminActionAllowed("super_admin", "disable_user"));
  assert.doesNotThrow(() => assertAdminActionAllowed("super_admin", "enable_user"));
  assert.throws(() => assertAdminActionAllowed("support", "set_plan"), { code: "admin_action_forbidden" });
  assert.throws(() => assertAdminActionAllowed("billing", "disable_user"), { code: "admin_action_forbidden" });
  assert.throws(() => assertAdminActionAllowed("operations", "set_plan"), { code: "admin_action_forbidden" });
  assert.throws(() => assertAdminActionAllowed("support", "grant_credits"), { code: "admin_action_forbidden" });
});

test("small credit grants are atomic, idempotent, audited, and cannot top up the operator's own workspace", async () => {
  const store = new MemoryStore();
  const services = buildServices(config, { store });
  await requireInternalAdmin(request("alex"), services);
  const blair = await services.directory.ensureAccount({ sub: "local-blair", email: "blair@localhost.test",
    name: "Blair", emailVerified: true, authTime: 1 });
  const action = parseAdminAction({ id: "grant-1", type: "grant_credits", targetId: blair.personalWorkspaceId,
    credits: 12.5, reason: "Approved support adjustment" });
  assert.deepEqual(await executeAdminAction(services, "local-alex", action), { result: "applied" });
  assert.equal((await services.ledger.balance(blair.personalWorkspaceId)).included, 212.5);
  assert.deepEqual(await executeAdminAction(services, "local-alex", action), { result: "duplicate" });
  assert.equal((await services.ledger.balance(blair.personalWorkspaceId)).included, 212.5);
  assert.equal((await adminOverview(services)).activity[0].credits, 12.5);
  assert.throws(() => parseAdminAction({ ...action, credits: 101 }), { code: "admin_invalid_action" });
  const alex = await services.directory.getUser("local-alex");
  await assert.rejects(executeAdminAction(services, "local-alex", { ...action, id: "grant-own", targetId: alex!.personalWorkspaceId }),
    { code: "admin_self_action" });
});

test("operator dashboard reads indexed customer data without exposing chat content", async () => {
  const store = new MemoryStore();
  const services = buildServices(config, { store });
  await requireInternalAdmin(request("alex"), services);
  const customer = await services.directory.ensureAccount({
    sub: "customer-index-test", email: "indexed@example.com", name: "Indexed Customer", emailVerified: true, authTime: 1,
  });
  await services.ledger.ensurePeriodGrant(customer.personalWorkspaceId, "free");
  const overview = await adminOverview(services);
  assert.equal(overview.summary.users, 1);
  assert.equal(overview.summary.workspaces, 1);
  assert.ok(overview.workspaces.every(workspace => !isLocalDevFixtureUserId(workspace.ownerId)));
  assert.ok(overview.users.every(user => user.id === customer.id));
  assert.ok(overview.users.every(user => !Object.hasOwn(user, "sessionsRevokedAfter")));
  assert.ok(overview.users.every(user => user.id !== "local-alex" && user.id !== "local-blair"));
  const detail = await adminCustomer(services, customer.id);
  assert.equal(detail.workspaces[0].credits.included, 200);
  assert.equal(detail.user.email, "indexed@example.com");
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
  const blairAfter = await services.directory.getUser(blair.id);
  assert.equal(blairAfter?.status, "active");
  assert.equal(blairAfter?.aiAccessSuspended, true);
  assert.equal(
    (await run(localCustomerRequest("/api/usage/", "blair"), usageHandler, services)).status,
    200,
    "suspended AI still allows sign-in and account APIs",
  );
  const chatBlocked = await run(
    localCustomerRequest("/api/chat/", "blair", {
      workspace: blair.personalWorkspaceId,
      body: { runId: "admin-ai-suspend", model: "nova", messages: [{ role: "user", content: "Hi" }] },
    }),
    adminChat,
    services,
  );
  assert.equal(chatBlocked.status, 403);
  assert.equal((await chatBlocked.json() as { code?: string }).code, "ai_access_suspended");
  assert.equal((await adminOverview(services)).activity[0].reason, "Requested by support");
  await assert.rejects(executeAdminAction(services, "local-alex", { ...action, reason: "Different reason" }),
    { code: "admin_action_conflict" });
  await assert.rejects(executeAdminAction(services, "local-alex", { ...action, id: "action-2", targetId: "local-alex" }),
    { code: "admin_self_action" });
  assert.throws(() => parseAdminAction({ id: "short", type: "enable_user", targetId: blair.id, reason: "x" }),
    { code: "admin_invalid_action" });
  const toggle = parseAdminAction({
    id: "toggle-1", type: "disable_user", targetId: blair.id, source: INTERNAL_AUDIT_SOURCE_AI_ACCESS,
  });
  assert.ok(toggle.reason.includes("Suspended ARIA AI"));
  assert.deepEqual(await executeAdminAction(services, "local-alex", toggle), { result: "applied" });
  assert.ok((await adminOverview(services)).activity[0].reason.includes("Suspended ARIA AI"));

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

test("a super admin can delegate scoped operator access to a verified email, and revoke it", async () => {
  const store = new MemoryStore();
  const services = buildServices(config, { store });
  await requireInternalAdmin(request("alex"), services);
  await assert.rejects(requireInternalAdmin(request("blair"), services), { code: "admin_access_denied" });

  const grant = await grantOperator(services, "local-alex", { email: " Blair@Localhost.test ", role: "billing" });
  assert.deepEqual({ email: grant.email, role: grant.role }, { email: "blair@localhost.test", role: "billing" });
  const operator = await requireInternalAdmin(request("blair"), services);
  assert.equal(operator.internalRole, "billing");
  assert.doesNotThrow(() => assertAdminActionAllowed(operator.internalRole, "set_plan"));
  assert.throws(() => assertAdminActionAllowed(operator.internalRole, "disable_user"), { code: "admin_action_forbidden" });

  await grantOperator(services, "local-alex", { email: "blair@localhost.test", role: "support" });
  assert.equal((await requireInternalAdmin(request("blair"), services)).internalRole, "support");
  assert.deepEqual((await listOperators(services)).map(o => [o.email, o.role]), [["blair@localhost.test", "support"]]);

  await revokeOperator(services, "local-alex", "blair@localhost.test");
  await assert.rejects(requireInternalAdmin(request("blair"), services), { code: "admin_access_denied" });
  await assert.rejects(revokeOperator(services, "local-alex", "blair@localhost.test"), { code: "admin_operator_not_found" });
  const actions = (await adminOverview(services)).activity.map(entry => entry.action);
  // The three writes can share a millisecond, so ordering between them is not asserted.
  assert.deepEqual(actions.slice(0, 3).sort(), ["grant_operator", "grant_operator", "revoke_operator"]);
});

test("operator grants reject super admin, bad roles and bad emails, and need a verified email", async () => {
  const store = new MemoryStore();
  const services = buildServices(config, { store });
  await requireInternalAdmin(request("alex"), services);
  for (const input of [
    { email: "blair@localhost.test", role: "super_admin" }, { email: "blair@localhost.test", role: "root" },
    { email: "not-an-email", role: "support" }, { email: 42, role: "support" }, {},
  ]) await assert.rejects(grantOperator(services, "local-alex", input), { code: "admin_invalid_operator" });

  await grantOperator(services, "local-alex", { email: "pending@example.com", role: "support" });
  const user = await services.directory.ensureAccount({ sub: "cog-1", email: "pending@example.com", name: "Pending",
    emailVerified: false, authTime: 1 });
  const unverified = { identity: { sub: "cog-1", email: "pending@example.com", emailVerified: false, name: "Pending", authTime: 1 }, user };
  assert.equal(await resolveInternalRole(services, unverified), undefined);
  assert.equal(await resolveInternalRole(services, { ...unverified, identity: { ...unverified.identity, emailVerified: true } }), "support");
});

test("usage analytics aggregate the ledger's daily rows by day, user and plan within the window", async () => {
  const store = new MemoryStore();
  const services = buildServices(config, { store });
  const now = Date.UTC(2026, 9, 28, 12);
  const blair = await services.directory.ensureAccount({ sub: "cog-blair", email: "blair@example.com", name: "Blair",
    emailVerified: true, authTime: 1 });
  const ws = blair.personalWorkspaceId;
  await store.transact([
    { kind: "put", item: { pk: `WS#${ws}`, sk: "ACT#cog-blair#2026-10-28", tokens: 1200, requests: 3, credits: 4500 } },
    { kind: "put", item: { pk: `WS#${ws}`, sk: "ACT#cog-blair#2026-10-27", tokens: 800, requests: 2, credits: 1500 } },
    { kind: "put", item: { pk: `WS#${ws}`, sk: "ACT#cog-blair#2026-08-01", tokens: 9999, requests: 9, credits: 9000 } },
    { kind: "put", item: { pk: `WS#${ws}`, sk: "ACT#cog-blair#2026-10-26", tokens: 50 } },
  ]);
  const usage = await adminUsage(services, 7, now);
  assert.equal(usage.series.length, 7);
  assert.equal(usage.series.at(-1)?.date, "2026-10-28");
  assert.deepEqual(usage.series.at(-1), { date: "2026-10-28", tokens: 1200, requests: 3, credits: 4.5, activeUsers: 1 });
  assert.deepEqual(usage.totals, { tokens: 2050, requests: 5, credits: 6, activeUsers: 1 });
  assert.equal(usage.byPlan.free?.tokens, 2050);
  assert.deepEqual(usage.topUsers.map(u => [u.id, u.email, u.tokens]), [["cog-blair", "blair@example.com", 2050]]);
  await assert.rejects(adminUsage(services, 14, now), { code: "admin_invalid_usage_window" });
});

test("model status shows what is configured and what actually served chat", async () => {
  const store = new MemoryStore();
  const local = buildServices(config, { store });
  const services = { ...local, config: { ...local.config, localIdentity: false } };
  const env = { ANTHROPIC_API_KEY: "test-key", ANTHROPIC_MODEL_ID: "claude-haiku-5-5", ARIA_NOVA_MODEL_ID: "amazon.nova-lite-v1:0",
    ARIA_RATE_VERSION: "v1", ARIA_NOVA_INPUT_USD_PER_MILLION: "0.06", ARIA_NOVA_OUTPUT_USD_PER_MILLION: "0.24" };

  assert.deepEqual([providerOf("claude-opus-5-5"), providerOf("us.amazon.nova-lite-v1:0"), providerOf("aria/local-test-nova")],
    ["claude", "bedrock", "local"]);

  const idle = await adminModels(services, Date.now(), env);
  assert.equal(idle.state, "idle");
  assert.deepEqual(idle.config.primary, { provider: "claude", modelId: "claude-haiku-5-5" });
  assert.deepEqual(idle.config.fallback, { configured: true, modelId: "amazon.nova-lite-v1:0" });

  await recordModelUse(store, { modelId: "claude-haiku-5-5", fallback: false, ok: true });
  const active = await adminModels(services, Date.now(), env);
  assert.equal(active.state, "active");
  assert.deepEqual(active.serving, { provider: "claude", modelId: "claude-haiku-5-5" });

  await recordModelUse(store, { modelId: "amazon.nova-lite-v1:0", fallback: true, ok: true });
  const fallback = await adminModels(services, Date.now(), env);
  assert.equal(fallback.state, "fallback");
  assert.equal(fallback.serving?.provider, "bedrock");
  assert.deepEqual(fallback.usage.totals, { claude: 1, bedrock: 1, local: 0, fallback: 1, failed: 0 });

  await recordModelUse(store, { modelId: "claude-haiku-5-5", fallback: false, ok: false });
  const failing = await adminModels(services, Date.now(), env);
  assert.equal(failing.state, "failing");
  assert.equal(failing.usage.totals.failed, 1);
  assert.equal(failing.serving?.provider, "claude");

  assert.equal((await adminModels(services, Date.now(), {})).state, "not_configured");
  assert.equal((await adminModels(services, Date.now(), { ...env, ARIA_NOVA_MODEL_ID: "" })).config.fallback.configured, false);
});

test("a completed chat request is counted against the model that answered it", async () => {
  const store = new MemoryStore();
  const services = buildServices(config, { store });
  const blair = await services.directory.ensureAccount({ sub: "local-blair", email: "blair@localhost.test", name: "Blair",
    emailVerified: true, authTime: 1 });
  const answering = chatHandler({
    provider: async function* () { yield { text: "ok" }; yield { usage: { inputTokens: 10, outputTokens: 5 } }; },
    modelConfig: model => ({ id: `${model}-admin-test`, rates: { input: 1, output: 1, version: "test" } }),
    maxOutputTokens: 32,
  });
  const failing = chatHandler({
    provider: async function* () { yield { text: "partial" }; },
    modelConfig: model => ({ id: `${model}-admin-test`, rates: { input: 1, output: 1, version: "test" } }),
    maxOutputTokens: 32,
  });
  const ask = async (handler: typeof answering, runId: string) => {
    const response = await run(localCustomerRequest("/api/chat/", "blair", {
      workspace: blair.personalWorkspaceId,
      body: { runId, model: "nova", messages: [{ role: "user", content: "Hi" }] },
    }), handler, services);
    assert.equal(response.status, 200);
    await response.text();
  };
  await ask(answering, "model-count-1");
  let usage = await readModelUsage(store);
  assert.deepEqual(usage.totals, { claude: 0, bedrock: 1, local: 0, fallback: 0, failed: 0 });
  assert.equal(usage.last?.modelId, "nova-admin-test");
  assert.equal(usage.last?.ok, true);

  await ask(failing, "model-count-2");
  usage = await readModelUsage(store);
  assert.deepEqual(usage.totals, { claude: 0, bedrock: 1, local: 0, fallback: 0, failed: 1 });
  assert.equal(usage.last?.ok, false);
});

test("admins change everything only when a super admin grants edit access; members stay view-only", async () => {
  const store = new MemoryStore();
  const services = buildServices({ ...config, adminEmails: ["boss@example.com"] }, { store });
  await requireInternalAdmin(request("alex"), services);
  const everything = ["disable_user", "enable_user", "revoke_sessions", "set_plan", "grant_credits"] as const;

  await grantOperator(services, "local-alex", { email: "blair@localhost.test", role: "admin" });
  let admin = await requireInternalAdmin(request("blair"), services);
  assert.deepEqual([admin.internalRole, admin.internalCanEdit], ["admin", false]);
  for (const type of everything) {
    assert.throws(() => assertAdminActionAllowed(admin.internalRole, type, admin.internalCanEdit), { code: "admin_action_forbidden" });
  }

  await grantOperator(services, "local-alex", { email: "blair@localhost.test", role: "admin", canEdit: true });
  admin = await requireInternalAdmin(request("blair"), services);
  assert.deepEqual([admin.internalRole, admin.internalCanEdit], ["admin", true]);
  for (const type of everything) assert.doesNotThrow(() => assertAdminActionAllowed(admin.internalRole, type, admin.internalCanEdit));

  await grantOperator(services, "local-alex", { email: "blair@localhost.test", role: "member", canEdit: true });
  const member = await requireInternalAdmin(request("blair"), services);
  assert.deepEqual([member.internalRole, member.internalCanEdit], ["member", false]);
  assert.throws(() => assertAdminActionAllowed("member", "set_plan", true), { code: "admin_action_forbidden" });

  await grantOperator(services, "local-alex", { email: "blair@localhost.test", role: "billing", canEdit: true });
  const [billing] = await listOperators(services);
  assert.deepEqual([billing?.role, billing?.canEdit], ["billing", false]);
  assert.doesNotThrow(() => assertAdminActionAllowed("billing", "set_plan"));
  assert.throws(() => assertAdminActionAllowed("billing", "disable_user", true), { code: "admin_action_forbidden" });

  assert.equal(hasFullAccess("super_admin", false), true);
  assert.equal(hasFullAccess("admin", false), false);
  assert.equal(hasFullAccess("admin", true), true);
  assert.equal(hasFullAccess("operations", true), false);
  assert.deepEqual((await listSuperAdmins(services)).map(person => person.email), ["boss@example.com"]);
});
