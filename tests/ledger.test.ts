import test from "node:test";
import assert from "node:assert/strict";
import { keys, ACTIVE_LOCK_MS, STALE_RESERVATION_MS, type Account } from "../lib/server/accounting/credit-ledger";
import { PLANS } from "../lib/server/accounts/entitlements";
import { createChatResponse, type StreamProvider } from "../lib/server/chat-service";
import { parseChatInput } from "../lib/server/chat-input";
import { ConditionFailed } from "../lib/server/store/types";
import { identity, ledgerEnv } from "./helpers";

const req = (id: string, units = 1000, hash = "h") => ({ id, hash, units, model: "m", rateVersion: "v" });
const settlement = (charged: number) => ({ charged, inputTokens: 10, outputTokens: 5, response: "ok" });
const jitter = () => new Promise<void>(r => setTimeout(r, Math.random() * 3));

/** A Team workspace with `count` active members sharing one pool. */
async function team(count: number) {
  const env = ledgerEnv();
  const owner = await env.directory.ensureAccount(identity("owner"));
  const ws = owner.personalWorkspaceId;
  await env.directory.applyEntitlement(env.ledger, ws, { plan: "team", eventId: "evt_team", occurredAt: 1 });
  // Seat limits are enforced by the directory; the ledger test seeds members directly to stress the shared pool.
  const members = Array.from({ length: count }, (_, i) => `m${i}`);
  await Promise.all(members.map(m => env.store.transact([{ kind: "put", item: { ...keys.member(ws, m), status: "active", role: "member" } }])));
  const account = (memberId: string): Account => ({ workspaceId: ws, memberId, plan: "team" });
  return { ...env, ws, members: ["owner", ...members], account };
}

/** Drains the pool to exactly `remaining` units via a settled charge. */
async function drainTo(env: Awaited<ReturnType<typeof team>>, remaining: number) {
  const { available } = await env.ledger.balance(env.ws);
  const spend = available * 1000 - remaining;
  await env.ledger.reserve(env.account("owner"), req("drain", spend));
  await env.ledger.settle(env.ws, "drain", settlement(spend));
}

test("independent workers spending one shared pool cannot overspend", async () => {
  const env = await team(40);
  await drainTo(env, 10_000);
  env.store.delay = jitter;
  const results = await Promise.allSettled(env.members.slice(1).map((m, i) => env.ledger.reserve(env.account(m), req(`r${i}`))));
  const ok = results.filter(r => r.status === "fulfilled").length;
  const rejected = results.filter(r => r.status === "rejected").map(r => (r as PromiseRejectedResult).reason.code);
  assert.equal(ok, 10);
  assert.ok(rejected.every(code => code === "insufficient_credits"));
  const balance = await env.ledger.balance(env.ws);
  assert.equal(balance.available, 0);
  assert.equal(balance.reserved, 10);
  // Settle half and release half concurrently; totals must reconcile exactly.
  const winners = results.flatMap((r, i) => r.status === "fulfilled" ? [`r${i}`] : []);
  await Promise.all(winners.map((id, i) => i % 2 ? env.ledger.settle(env.ws, id, settlement(400)) : env.ledger.fail(env.ws, id)));
  const after = await env.ledger.balance(env.ws);
  assert.equal(after.reserved, 0);
  assert.equal(after.available, 10 - 5 * 0.4);
  assert.equal(after.used + after.available + after.reserved, after.included);
});

test("a member cannot run two requests at once even from separate workers", async () => {
  const env = await team(1);
  env.store.delay = jitter;
  const results = await Promise.allSettled(["a", "b", "c", "d"].map(id => env.ledger.reserve(env.account("m0"), req(id))));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal((await env.ledger.balance(env.ws)).reserved, 1);
});

test("per-member rate limit is enforced across workers", async () => {
  const env = await team(1);
  const burst = PLANS.team.requestsPerMinute;
  for (let i = 0; i < burst; i++) {
    await env.ledger.reserve(env.account("m0"), req(`q${i}`));
    await env.ledger.settle(env.ws, `q${i}`, settlement(500));
  }
  await assert.rejects(env.ledger.reserve(env.account("m0"), req("q_burst")), { code: "rate_limited" });
  env.time.advance(60_000);
  await env.ledger.reserve(env.account("m0"), req("q_burst"));
});

test("daily message limit follows the workspace plan", async () => {
  const env = ledgerEnv();
  const owner = await env.directory.ensureAccount(identity("daily_cap"));
  const ws = owner.personalWorkspaceId;
  await env.ledger.ensurePeriodGrant(ws, "free");
  const account: Account = { workspaceId: ws, memberId: "daily_cap", plan: "free" };
  const cap = PLANS.free.messagesPerDay;
  const burst = PLANS.free.requestsPerMinute;
  for (let i = 0; i < cap; i++) {
    if (i > 0 && i % burst === 0) env.time.advance(60_000);
    await env.ledger.reserve(account, req(`day${i}`));
    await env.ledger.settle(ws, `day${i}`, settlement(100));
  }
  env.time.advance(60_000);
  await assert.rejects(env.ledger.reserve(account, req("day_over")), { code: "daily_message_limit" });
});

test("retried request IDs reserve once, settle once, and replay the stored result", async () => {
  const env = await team(1);
  env.store.delay = jitter;
  const attempts = await Promise.all(Array.from({ length: 6 }, () => env.ledger.reserve(env.account("m0"), req("retry"))));
  assert.equal(attempts.filter(a => a === undefined).length, 1, "exactly one attempt creates the hold");
  assert.ok(attempts.every(a => a === undefined || a.status === "reserved"));
  await Promise.all(Array.from({ length: 6 }, () => env.ledger.settle(env.ws, "retry", settlement(700))));
  const events = env.store.dump().filter(i => i.sk.startsWith("EVT#retry#"));
  assert.deepEqual(events.map(e => e.kind).sort(), ["reserve", "settle"]);
  assert.equal((await env.ledger.balance(env.ws)).used, 0.7);
  const replay = await env.ledger.reserve(env.account("m0"), req("retry"));
  assert.equal(replay?.status, "completed");
  assert.equal(replay?.response, "ok");
  // A late release after settlement must not refund a delivered answer.
  await env.ledger.fail(env.ws, "retry");
  assert.equal((await env.ledger.find(env.ws, "retry"))?.status, "completed");
});

test("full chat retry with the same request ID calls the model once and charges once", async () => {
  const env = await team(1);
  let calls = 0;
  const provider: StreamProvider = async function* () { calls++; yield { text: "answer" }; yield { usage: { inputTokens: 50, outputTokens: 10 } }; };
  const input = parseChatInput({ runId: "client_retry_1", messages: [{ role: "user", content: "Explain idempotent APIs briefly" }] });
  const opts = { ledger: env.ledger, account: env.account("m0"), modelId: "m", rates: { input: 0.06, output: 0.24, version: "v" },
    provider, signal: new AbortController().signal, maxOutputTokens: 256 };
  const before = (await env.ledger.balance(env.ws)).used;
  await (await createChatResponse(input, opts)).text();
  const charged = (await env.ledger.balance(env.ws)).used - before;
  assert.match(await (await createChatResponse(input, opts)).text(), /answer/);
  assert.equal(calls, 1);
  assert.equal((await env.ledger.balance(env.ws)).used - before, charged);
});

test("crash before the provider call: reconciliation releases the hold and blocks a second call", async () => {
  const env = await team(1);
  await env.ledger.reserve(env.account("m0"), req("crash1"));
  // Worker dies here. The member's lock expires so they are not locked out.
  env.time.advance(ACTIVE_LOCK_MS + 1);
  await env.ledger.reserve(env.account("m0"), req("next"));
  await env.ledger.fail(env.ws, "next");
  assert.deepEqual(await env.ledger.reconcile(), { released: 0, providerCostReview: 0 }, "not stale yet");
  env.time.advance(STALE_RESERVATION_MS);
  assert.deepEqual(await env.ledger.reconcile(), { released: 1, providerCostReview: 0 });
  assert.equal((await env.ledger.balance(env.ws)).reserved, 0);
  const record = await env.ledger.find(env.ws, "crash1");
  assert.equal(record?.failureReason, "expired_before_provider_call");
  await assert.rejects(env.ledger.markProviderStarted(env.ws, "crash1"), { code: "request_not_reserved" });
  assert.deepEqual(await env.ledger.reconcile(), { released: 0, providerCostReview: 0 }, "reconciliation is idempotent");
});

test("crash after the provider started: customer is released, provider cost is flagged, late settle is ignored", async () => {
  const env = await team(1);
  await env.ledger.reserve(env.account("m0"), req("crash2"));
  await env.ledger.markProviderStarted(env.ws, "crash2");
  env.time.advance(STALE_RESERVATION_MS + 1);
  assert.deepEqual(await env.ledger.reconcile(), { released: 0, providerCostReview: 1 });
  const record = await env.ledger.find(env.ws, "crash2");
  assert.equal(record?.reconciliation, "provider_cost_review");
  const before = await env.ledger.balance(env.ws);
  await env.ledger.settle(env.ws, "crash2", settlement(500));
  assert.deepEqual(await env.ledger.balance(env.ws), before);
});

test("a crash mid-transaction applies nothing; settlement can then complete exactly once", async () => {
  const env = await team(1);
  await env.ledger.reserve(env.account("m0"), req("tx"));
  const snapshot = JSON.stringify(env.store.dump());
  env.store.beforeCommit = () => { throw new Error("connection reset"); };
  await assert.rejects(env.ledger.settle(env.ws, "tx", settlement(600)), /connection reset/);
  assert.equal(JSON.stringify(env.store.dump()), snapshot, "no partial writes");
  env.store.beforeCommit = undefined;
  await env.ledger.settle(env.ws, "tx", settlement(600));
  await env.ledger.settle(env.ws, "tx", settlement(600));
  assert.equal(env.store.dump().filter(i => i.sk === "EVT#tx#settle").length, 1);
});

test("settlement failure after delivery leaves the hold for reconciliation instead of refunding", async () => {
  const env = await team(1);
  const input = parseChatInput({ runId: "deferred_settle", messages: [{ role: "user", content: "Explain idempotent APIs briefly" }] });
  const provider: StreamProvider = async function* () { yield { text: "delivered" }; yield { usage: { inputTokens: 5, outputTokens: 5 } }; };
  const original = console.error; console.error = () => {};
  env.store.beforeCommit = writes => {
    if (writes.some(w => w.kind === "update" && w.set?.status === "completed")) throw new Error("ledger unavailable");
  };
  try {
    const text = await (await createChatResponse(input, { ledger: env.ledger, account: env.account("m0"), modelId: "m",
      rates: { input: 0.06, output: 0.24, version: "v" }, provider, signal: new AbortController().signal, maxOutputTokens: 64 })).text();
    assert.match(text, /delivered/);
    assert.equal((await env.ledger.find(env.ws, "deferred_settle"))?.status, "reserved");
  } finally { console.error = original; env.store.beforeCommit = undefined; }
});

test("renewal cannot move an in-flight charge into the new period", async () => {
  const env = await team(1);
  await env.ledger.reserve(env.account("m0"), req("boundary", 5000));
  env.time.advance(12 * 24 * 3600_000); // crosses into November
  await env.ledger.ensurePeriodGrant(env.ws, "team");
  await env.ledger.settle(env.ws, "boundary", settlement(3000));
  const november = await env.ledger.balance(env.ws);
  assert.equal(november.period, "2026-11");
  assert.equal(november.used, 0);
  const october = await env.store.get(keys.period(env.ws, "2026-10"));
  assert.equal(october?.used, 3000);
  assert.equal(october?.reserved, 0);
});

test("removing a member or changing plan between authorization and reservation is enforced atomically", async () => {
  const env = await team(2);
  await env.store.transact([{ kind: "update", key: keys.member(env.ws, "m1"), set: { status: "revoked" } }]);
  await assert.rejects(env.ledger.reserve(env.account("m1"), req("revoked")), { code: "access_revoked" });
  await env.directory.applyEntitlement(env.ledger, env.ws, { plan: "pro", eventId: "evt_down", occurredAt: 2 });
  await assert.rejects(env.ledger.reserve(env.account("m0"), req("stale-plan")), { code: "entitlement_changed" });
  assert.equal((await env.ledger.balance(env.ws)).reserved, 0);
});

test("memory store rejects a transaction that touches an item twice, like DynamoDB", async () => {
  const env = ledgerEnv();
  const key = { pk: "a", sk: "b" };
  await assert.rejects(env.store.transact([{ kind: "put", item: key }, { kind: "delete", key }]), /same item/);
  await env.store.transact([{ kind: "put", item: { ...key, n: 1 } }]);
  await assert.rejects(env.store.transact([{ kind: "update", key, add: { n: 1 }, when: [{ field: "n", op: ">", value: 5 }] }]),
    (e: unknown) => e instanceof ConditionFailed && e.failedIndexes[0] === 0);
});
