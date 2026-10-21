import test from "node:test";
import assert from "node:assert/strict";
import { membersPatchHandler, run, sessionHandler } from "../lib/server/handlers";
import { identity, ledgerEnv, request, testServices, tokensFor } from "./helpers";
import { keys } from "../lib/server/accounting/credit-ledger";

const req = (id: string, units: number) => ({ id, hash: id, units, model: "nova", rateVersion: "test" });
const settled = (charged: number) => ({ charged, inputTokens: 1, outputTokens: 1, response: "ok" });

test("Team member limit holds, settles, refunds, and resets in the next UTC month", async () => {
  const env = ledgerEnv();
  const owner = await env.directory.ensureAccount(identity("owner"));
  const workspaceId = owner.personalWorkspaceId;
  await env.directory.applyEntitlement(env.ledger, workspaceId, { plan: "team", eventId: "upgrade", occurredAt: 1 });
  await env.store.transact([{ kind: "put", item: { ...keys.member(workspaceId, "teammate"),
    status: "active", role: "member" } }]);
  const account = { workspaceId, memberId: "teammate", plan: "team" as const };
  await env.ledger.setMemberLimit(workspaceId, "owner", "owner", "teammate", "member", 2_000);
  await env.ledger.reserve(account, req("first", 1_500));
  assert.equal((await env.ledger.memberBudget(workspaceId, "teammate")).reserved, 1.5);
  await env.ledger.settle(workspaceId, "first", settled(500));
  await assert.rejects(env.ledger.reserve(account, req("too-much", 1_501)), { code: "member_limit_exceeded" });
  assert.deepEqual(await env.ledger.memberBudget(workspaceId, "teammate"),
    { period: "2026-10", limit: 2, used: 0.5, reserved: 0 });
  await env.ledger.reserve(account, req("second", 1_500));
  await env.ledger.setMemberLimit(workspaceId, "owner", "owner", "teammate", "member", 0);
  await env.ledger.fail(workspaceId, "second");
  assert.equal((await env.ledger.memberBudget(workspaceId, "teammate")).reserved, 0);
  await assert.rejects(env.ledger.reserve(account, req("blocked", 1)), { code: "member_limit_exceeded" });
  await env.ledger.setMemberLimit(workspaceId, "owner", "owner", "teammate", "member", null);
  await env.ledger.reserve(account, req("unlimited", 1_000));
  await env.ledger.fail(workspaceId, "unlimited");
  await env.ledger.setMemberLimit(workspaceId, "owner", "owner", "teammate", "member", 2_000);
  env.time.advance(12 * 24 * 3_600_000);
  await env.ledger.ensurePeriodGrant(workspaceId, "team");
  assert.deepEqual(await env.ledger.memberBudget(workspaceId, "teammate"),
    { period: "2026-11", limit: 2, used: 0, reserved: 0 });
  await env.ledger.reserve(account, req("november", 1_000));
  assert.deepEqual(await env.ledger.memberBudget(workspaceId, "teammate"),
    { period: "2026-11", limit: 2, used: 0, reserved: 1 });
});

test("only Team owners and admins can set allowed members' limits", async () => {
  const s = testServices();
  const alice = tokensFor("alice"), bob = tokensFor("bob"), carol = tokensFor("carol");
  const session = await run(request("/api/auth/session/", { tokens: alice }), sessionHandler, s);
  const workspaceId = (await session.json()).workspace.id as string;
  await s.directory.applyEntitlement(s.ledger, workspaceId, { plan: "team", eventId: "upgrade", occurredAt: 1 });
  await s.store.transact([
    { kind: "put", item: { ...keys.member(workspaceId, "bob"), status: "active", role: "member" } },
    { kind: "put", item: { ...keys.member(workspaceId, "carol"), status: "active", role: "admin" } },
  ]);
  const patch = (tokens: ReturnType<typeof tokensFor>, id: string, limit: unknown, workspace = workspaceId) =>
    run(request("/api/workspace/members/", { method: "PATCH", tokens, workspace, body: { id, limit } }), membersPatchHandler, s);
  assert.equal((await patch(alice, "bob", 2)).status, 200);
  assert.equal((await s.ledger.memberBudget(workspaceId, "bob")).limit, 2);
  assert.equal((await patch(bob, "carol", 1)).status, 403);
  assert.equal((await patch(carol, "alice", 1)).status, 403);
  assert.equal((await patch(carol, "bob", 1)).status, 200);
  assert.equal((await patch(alice, "bob", -1)).status, 400);
  assert.equal((await patch(alice, "bob", 1.5)).status, 400);
  assert.equal((await patch(alice, "bob", 20_001)).status, 400);
  assert.equal((await patch(alice, "bob", 1, "another-workspace")).status, 404);
  assert.equal((await s.ledger.memberBudget(workspaceId, "bob")).limit, 1);
});
