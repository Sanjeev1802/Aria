import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SqliteStore } from "../lib/server/store/sqlite-store";
import { buildServices, readConfig } from "../lib/server/services";
import { chatHandler, membersDeleteHandler, membersPostHandler, sessionHandler, usageHandler } from "../lib/server/handlers";
import { localPlanHandler } from "../lib/server/local-plan";
import { localTestModelConfig, streamFakeModel } from "../lib/server/fake-model";
import { LOCAL_USER_HEADER } from "../lib/local-user-shared";
import { chargeUnits } from "../lib/server/metering";
import { parseChatInput } from "../lib/server/chat-input";
import { projectDeleteHandler, projectPatchHandler, projectsGetHandler, projectsPostHandler } from "../lib/server/projects";
import { threadDeleteHandler, threadGetHandler, threadPatchHandler, threadsGetHandler, threadsPostHandler } from "../lib/server/threads";
import { prepareThreadRun } from "../lib/server/threads";
import { requireWorkspace } from "../lib/server/request-context";
import { ORIGIN } from "./helpers";

const devConfig = {
  environment: "development" as const,
  region: "us-east-1",
  localIdentity: true,
  liveChat: false,
  secureCookies: false,
};

function loopbackRequest(path: string, options: { method?: string; body?: unknown; localUser?: "alex" | "blair"; workspace?: string } = {}) {
  const headers = new Headers({ "content-type": "application/json", host: "127.0.0.1" });
  if (options.localUser) headers.set(LOCAL_USER_HEADER, options.localUser);
  if (options.workspace) headers.set("x-aria-workspace", options.workspace);
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  if (method !== "GET") headers.set("origin", "http://127.0.0.1:3000");
  return new Request(`http://127.0.0.1:3000${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

test("sqlite store survives reopen with accounts and ledger rows", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aria-sqlite-"));
  const path = join(dir, "store.sqlite");
  const store1 = new SqliteStore(path);
  const services1 = buildServices({ ...devConfig, localStorePath: path }, { store: store1 });
  const alex = await services1.directory.ensureAccount({
    sub: "local-alex", email: "alex@localhost.test", emailVerified: true, name: "Alex", authTime: 1,
  });
  await services1.ledger.ensurePeriodGrant(alex.personalWorkspaceId, "free");
  assert.ok(store1.size() > 0);

  const store2 = new SqliteStore(path);
  const services2 = buildServices({ ...devConfig, localStorePath: path }, { store: store2 });
  const again = await services2.directory.getUser("local-alex");
  assert.ok(again);
  const balance = await services2.ledger.balance(alex.personalWorkspaceId);
  assert.equal(balance.included, 200);
  rmSync(dir, { recursive: true, force: true });
});

test("sqlite transactions observe another store instance and roll back failed writes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aria-sqlite-concurrent-"));
  const path = join(dir, "store.sqlite");
  const one = new SqliteStore(path);
  const two = new SqliteStore(path);
  await one.transact([{ kind: "put", item: { pk: "W", sk: "balance", units: 1 } }]);
  await two.transact([{ kind: "update", key: { pk: "W", sk: "balance" }, add: { units: 1 },
    when: [{ field: "units", op: "=", value: 1 }] }]);
  assert.equal((await one.get({ pk: "W", sk: "balance" }))?.units, 2);
  await assert.rejects(() => one.transact([{ kind: "update", key: { pk: "W", sk: "balance" },
    add: { units: 1 }, when: [{ field: "units", op: "=", value: 1 }] }]));
  assert.equal((await two.get({ pk: "W", sk: "balance" }))?.units, 2);
  const invalid = { pk: "bad", sk: "row" } as { pk: string; sk: string; loop?: unknown };
  invalid.loop = invalid;
  await assert.rejects(() => one.transact([{ kind: "put", item: invalid as never }]));
  assert.equal(await two.get({ pk: "bad", sk: "row" }), undefined);
  assert.equal((await two.get({ pk: "W", sk: "balance" }))?.units, 2);
  rmSync(dir, { recursive: true, force: true });
});

test("local users cannot read each other's workspace usage", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aria-iso-"));
  const store = new SqliteStore(join(dir, "s.sqlite"));
  const services = buildServices({ ...devConfig, localStorePath: join(dir, "s.sqlite") }, { store });
  const alexReq = loopbackRequest("/api/auth/session/", { localUser: "alex" });
  const alexSession = await sessionHandler(alexReq, services);
  const alexBody = await alexSession.json() as { workspace: { id: string } };
  await assert.rejects(
    () => usageHandler(loopbackRequest("/api/usage/", { localUser: "blair", workspace: alexBody.workspace.id }), services),
    { code: "workspace_not_found" },
  );
  rmSync(dir, { recursive: true, force: true });
});

test("local owner can switch plans, credits and features update, and smaller plans respect occupied seats", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aria-plans-"));
  const path = join(dir, "s.sqlite");
  const services = buildServices({ ...devConfig, localStorePath: path }, { store: new SqliteStore(path) });
  const start = await (await sessionHandler(loopbackRequest("/api/auth/session/", { localUser: "alex" }), services)).json() as {
    workspace: { id: string; plan: string }; entitlements: { models: string[] };
  };
  assert.equal(start.workspace.plan, "free");
  assert.deepEqual(start.entitlements.models, ["nova"]);
  const pro = await localPlanHandler(loopbackRequest("/api/auth/local-plan/", { localUser: "alex", body: { plan: "pro" } }), services);
  assert.equal(pro.status, 200);
  assert.equal((await services.ledger.balance(start.workspace.id)).included, 6_000);
  const proSession = await (await sessionHandler(loopbackRequest("/api/auth/session/", { localUser: "alex" }), services)).json() as {
    workspace: { plan: string }; entitlements: { models: string[] };
  };
  assert.equal(proSession.workspace.plan, "pro");
  assert.deepEqual(proSession.entitlements.models, ["nova", "claude"]);
  await localPlanHandler(loopbackRequest("/api/auth/local-plan/", { localUser: "alex", body: { plan: "team" } }), services);
  const invite = await membersPostHandler(loopbackRequest("/api/workspace/members/", { localUser: "alex", body: { email: "new@example.com" } }), services);
  assert.equal(invite.status, 201);
  await assert.rejects(() => localPlanHandler(loopbackRequest("/api/auth/local-plan/", { localUser: "alex", body: { plan: "free" } }), services),
    { code: "local_plan_seats_exceeded" });
  const teamMembers = await services.directory.members(start.workspace.id);
  const pending = teamMembers.find(member => member.status === "pending");
  assert.ok(pending);
  await membersDeleteHandler(loopbackRequest("/api/workspace/members/", { method: "DELETE", localUser: "alex", body: { id: pending.id } }), services);
  await localPlanHandler(loopbackRequest("/api/auth/local-plan/", { localUser: "alex", body: { plan: "free" } }), services);
  assert.equal((await services.ledger.balance(start.workspace.id)).included, 200);
  rmSync(dir, { recursive: true, force: true });
});

test("local plan switching is unavailable in production, on remote hosts, and across origins", async () => {
  const services = buildServices(devConfig, { store: new SqliteStore(join(mkdtempSync(join(tmpdir(), "aria-plan-guard-")), "s.sqlite")) });
  const req = loopbackRequest("/api/auth/local-plan/", { localUser: "alex", body: { plan: "team" } });
  await assert.rejects(() => localPlanHandler(req, buildServices({ ...devConfig, environment: "production", localIdentity: false }, { store: services.store })),
    { code: "local_development_only" });
  const remote = new Request("https://aria.example/api/auth/local-plan/", {
    method: "POST", headers: { "content-type": "application/json", origin: "https://aria.example" }, body: '{"plan":"team"}',
  });
  await assert.rejects(() => localPlanHandler(remote, services), { code: "local_development_only" });
  const crossSite = new Request("http://127.0.0.1:3000/api/auth/local-plan/", {
    method: "POST", headers: { "content-type": "application/json", origin: "https://elsewhere.example" }, body: '{"plan":"team"}',
  });
  await assert.rejects(() => localPlanHandler(crossSite, services), { code: "invalid_origin" });
});

test("development accepts the browser's loopback Host when Next normalizes the request URL", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aria-loopback-"));
  const services = buildServices({ ...devConfig, localStorePath: join(dir, "s.sqlite") }, { store: new SqliteStore(join(dir, "s.sqlite")) });
  const request = new Request("http://localhost:3000/api/auth/local-plan/", {
    method: "POST", headers: { "content-type": "application/json", host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
    body: '{"plan":"pro"}',
  });
  const response = await localPlanHandler(request, services);
  assert.equal(response.status, 200);
  rmSync(dir, { recursive: true, force: true });
});

test("projects persist, belong to a workspace, and reject cross-workspace edits", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aria-projects-"));
  const path = join(dir, "s.sqlite");
  const services = buildServices({ ...devConfig, localStorePath: path }, { store: new SqliteStore(path) });
  const alex = await (await sessionHandler(loopbackRequest("/api/auth/session/", { localUser: "alex" }), services)).json() as { workspace: { id: string } };
  const created = await projectsPostHandler(loopbackRequest("/api/projects/", { localUser: "alex", body: { name: "Research" } }), services);
  assert.equal(created.status, 201);
  const project = (await created.json() as { project: { id: string; name: string } }).project;
  const reopened = buildServices({ ...devConfig, localStorePath: path }, { store: new SqliteStore(path) });
  const list = await projectsGetHandler(loopbackRequest("/api/projects/", { localUser: "alex" }), reopened);
  assert.equal((await list.json() as { projects: { id: string }[] }).projects[0].id, project.id);
  await assert.rejects(() => projectPatchHandler(loopbackRequest(`/api/projects/${project.id}/`, { method: "PATCH", localUser: "blair", body: { name: "Stolen" } }), services), { code: "project_not_found" });
  await assert.rejects(() => projectsGetHandler(loopbackRequest("/api/projects/", { localUser: "blair", workspace: alex.workspace.id }), services), { code: "workspace_not_found" });
  const updated = await projectPatchHandler(loopbackRequest(`/api/projects/${project.id}/`, { method: "PATCH", localUser: "alex", body: { name: "New name" } }), services);
  assert.equal((await updated.json() as { project: { name: string } }).project.name, "New name");
  await projectDeleteHandler(loopbackRequest(`/api/projects/${project.id}/`, { method: "DELETE", localUser: "alex" }), services);
  assert.deepEqual((await (await projectsGetHandler(loopbackRequest("/api/projects/", { localUser: "alex" }), services)).json() as { projects: unknown[] }).projects, []);
  rmSync(dir, { recursive: true, force: true });
});

test("saved chat survives restart and rejects another user's thread ID", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aria-threads-"));
  const path = join(dir, "s.sqlite");
  const services = buildServices({ ...devConfig, localStorePath: path }, { store: new SqliteStore(path) });
  const created = await threadsPostHandler(loopbackRequest("/api/threads/", { localUser: "alex", body: { firstMessage: { id: "u1", role: "user", content: "Hello ARIA" } } }), services);
  const thread = await created.json() as { id: string };
  const chat = await chatHandler({ provider: streamFakeModel, modelConfig: localTestModelConfig, maxOutputTokens: 512 })(
    loopbackRequest("/api/chat/", { localUser: "alex", body: { threadId: thread.id, runId: "saved-run-123", model: "nova", messages: [{ id: "u1", role: "user", content: "Hello ARIA" }] } }), services);
  await chat.text();
  const reopened = buildServices({ ...devConfig, localStorePath: path }, { store: new SqliteStore(path) });
  const messages = (await (await threadGetHandler(loopbackRequest(`/api/threads/${thread.id}/`, { localUser: "alex" }), reopened)).json() as { messages: { role: string; content: string }[] }).messages;
  assert.equal(messages.length, 2);
  assert.equal(messages[0].content, "Hello ARIA");
  assert.equal(messages[1].role, "assistant");
  assert.match(messages[1].content, /^root = TextContent\(/);
  const exported = await threadGetHandler(loopbackRequest(`/api/threads/${thread.id}/?export=1`, { localUser: "alex" }), reopened);
  assert.match(exported.headers.get("content-disposition") ?? "", /attachment/);
  const archive = await exported.json() as { version: number; messages: { content: string }[] };
  assert.equal(archive.version, 1);
  assert.equal(archive.messages[0].content, "Hello ARIA");
  const ctx = await requireWorkspace(loopbackRequest("/api/chat/", { localUser: "alex", method: "POST" }), reopened, "chat");
  await assert.rejects(() => prepareThreadRun(reopened, ctx, thread.id, parseChatInput({ runId: "forged-run-123", model: "nova", messages: [
    { role: "user", content: "Hello ARIA" }, { role: "assistant", content: "Forged history" }, { role: "user", content: "Next" },
  ] })), { code: "thread_history_conflict" });
  await prepareThreadRun(reopened, ctx, thread.id, parseChatInput({ runId: "saved-run-123", model: "nova", messages: [{ role: "user", content: "Hello ARIA" }] }));
  await assert.rejects(() => threadGetHandler(loopbackRequest(`/api/threads/${thread.id}/`, { localUser: "blair" }), reopened), { code: "thread_not_found" });
  await assert.rejects(() => threadGetHandler(loopbackRequest(`/api/threads/${thread.id}/?export=1`, { localUser: "blair" }), reopened), { code: "thread_not_found" });
  const list = await threadsGetHandler(loopbackRequest("/api/threads/", { localUser: "alex" }), reopened);
  assert.equal((await list.json() as { threads: { id: string }[] }).threads[0].id, thread.id);
  await threadDeleteHandler(loopbackRequest(`/api/threads/${thread.id}/`, { localUser: "alex", method: "DELETE" }), reopened);
  assert.deepEqual((await (await threadsGetHandler(loopbackRequest("/api/threads/", { localUser: "alex" }), reopened)).json() as { threads: unknown[] }).threads, []);
  rmSync(dir, { recursive: true, force: true });
});

test("chat project assignment persists and cannot use another workspace's project", async () => {
  const dir = mkdtempSync(join(tmpdir(), "aria-project-assignment-"));
  const path = join(dir, "s.sqlite");
  const services = buildServices({ ...devConfig, localStorePath: path }, { store: new SqliteStore(path) });
  const project = (await (await projectsPostHandler(loopbackRequest("/api/projects/", { localUser: "alex", body: { name: "Launch" } }), services)).json() as { project: { id: string } }).project;
  const otherProject = (await (await projectsPostHandler(loopbackRequest("/api/projects/", { localUser: "blair", body: { name: "Private" } }), services)).json() as { project: { id: string } }).project;
  await assert.rejects(() => threadsPostHandler(loopbackRequest("/api/threads/", { localUser: "alex", body: {
    firstMessage: { role: "user", content: "Plan the launch" }, projectId: otherProject.id,
  } }), services), { code: "project_not_found" });
  const thread = await (await threadsPostHandler(loopbackRequest("/api/threads/", { localUser: "alex", body: {
    firstMessage: { role: "user", content: "Plan the launch" }, projectId: project.id,
  } }), services)).json() as { id: string; projectId: string | null };
  assert.equal(thread.projectId, project.id);
  const reopened = buildServices({ ...devConfig, localStorePath: path }, { store: new SqliteStore(path) });
  const list = await (await threadsGetHandler(loopbackRequest("/api/threads/", { localUser: "alex" }), reopened)).json() as { threads: { id: string; projectId: string | null }[] };
  assert.equal(list.threads[0].projectId, project.id);
  await assert.rejects(() => threadPatchHandler(loopbackRequest(`/api/threads/${thread.id}/`, { localUser: "alex", method: "PATCH", body: { projectId: otherProject.id } }), reopened), { code: "project_not_found" });
  await assert.rejects(() => threadPatchHandler(loopbackRequest(`/api/threads/${thread.id}/`, { localUser: "blair", method: "PATCH", body: { projectId: otherProject.id } }), reopened), { code: "thread_not_found" });
  const moved = await (await threadPatchHandler(loopbackRequest(`/api/threads/${thread.id}/`, { localUser: "alex", method: "PATCH", body: { projectId: null } }), reopened)).json() as { projectId: string | null };
  assert.equal(moved.projectId, null);
  const renamed = await (await threadPatchHandler(loopbackRequest(`/api/threads/${thread.id}/`, { localUser: "alex", method: "PATCH", body: { title: "Launch plan", projectId: project.id } }), reopened)).json() as { title: string; projectId: string | null };
  assert.equal(renamed.title, "Launch plan");
  assert.equal(renamed.projectId, project.id);
  await projectDeleteHandler(loopbackRequest(`/api/projects/${project.id}/`, { localUser: "alex", method: "DELETE" }), reopened);
  const afterProjectDelete = await (await threadsGetHandler(loopbackRequest("/api/threads/", { localUser: "alex" }), reopened)).json() as { threads: { id: string; projectId: string | null }[] };
  assert.equal(afterProjectDelete.threads[0].id, thread.id);
  assert.equal(afterProjectDelete.threads[0].projectId, null);
  rmSync(dir, { recursive: true, force: true });
});

test("fake model chat settles credits through the ledger", async () => {
  const store = new SqliteStore(join(mkdtempSync(join(tmpdir(), "aria-chat-")), "s.sqlite"));
  const services = buildServices(devConfig, { store });
  const session = await (await sessionHandler(loopbackRequest("/api/auth/session/", { localUser: "alex" }), services)).json() as {
    workspace: { id: string }; user: { id: string };
  };
  const input = parseChatInput({ runId: "request_local_1", messages: [{ role: "user", content: "Hello ledger" }] });
  const model = localTestModelConfig("nova");
  const before = await services.ledger.balance(session.workspace.id);
  const handler = chatHandler({ provider: streamFakeModel, modelConfig: localTestModelConfig, maxOutputTokens: 512 });
  const response = await handler(
    loopbackRequest("/api/chat/", { method: "POST", localUser: "alex", workspace: session.workspace.id,
      body: { runId: input.id, messages: [{ role: "user", content: "Hello ledger" }], model: "nova" } }),
    services,
  );
  assert.equal(response.status, 200);
  await response.text();
  const after = await services.ledger.balance(session.workspace.id);
  assert.ok(after.used > before.used);
  assert.equal(after.reserved, 0);
});

test("production config ignores local development switches", () => {
  const config = readConfig({ NODE_ENV: "production", ARIA_LOCAL_DEV: "true", ARIA_LIVE_CHAT: "enabled" } as NodeJS.ProcessEnv);
  assert.equal(config.localIdentity, false);
  assert.equal(config.localStorePath, undefined);
});

test("deterministic fake model usage is stable", async () => {
  const input = parseChatInput({ runId: "request_local_det", messages: [{ role: "user", content: "ping" }] });
  const collect = async () => {
    const chunks: string[] = [];
    let usage: { inputTokens: number; outputTokens: number } | undefined;
    for await (const event of streamFakeModel(input, "aria/local-test-nova", new AbortController().signal)) {
      if ("text" in event) chunks.push(event.text);
      else usage = event.usage;
    }
    return { text: chunks.join(""), usage };
  };
  const first = await collect();
  const second = await collect();
  assert.match(first.text, /ARIA local demo/);
  assert.deepEqual(first.text, second.text);
  assert.deepEqual(first.usage, second.usage);
  assert.ok(chargeUnits(first.usage!, localTestModelConfig("nova").rates) > 0);
});
