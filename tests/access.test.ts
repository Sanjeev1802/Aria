import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptInviteHandler, chatHandler, membersDeleteHandler, membersGetHandler, membersPostHandler,
  refreshHandler, run, sessionHandler, signInHandler, signOutHandler, usageHandler,
} from "../lib/server/handlers";
import { cognitoVerifier } from "../lib/server/auth/verifier";
import type { StreamProvider } from "../lib/server/chat-service";
import type { Services } from "../lib/server/services";
import { INVITE_TTL_MS } from "../lib/server/accounts/directory";
import { attackerKey, CLIENT, identity, JWKS, ledgerEnv, POOL, request, sse, testServices, tokensFor } from "./helpers";

const rates = { input: 0.06, output: 0.24, version: "test" };
let providerCalls = 0;
const provider: StreamProvider = async function* () {
  providerCalls++;
  yield { text: "Hello" };
  yield { usage: { inputTokens: 40, outputTokens: 10 } };
};
const chat = chatHandler({ provider, modelConfig: m => ({ id: `${m}-test`, rates }), maxOutputTokens: 256 });
const chatBody = (runId: string, extra: Record<string, unknown> = {}) =>
  ({ runId, model: "nova", messages: [{ role: "user", content: "Hi" }], ...extra });

async function call(s: Services, handler: Parameters<typeof run>[1], req: Request) {
  const response = await run(req, handler, s);
  const type = response.headers.get("content-type") ?? "";
  return { response, status: response.status, body: type.includes("json") ? await response.json() as Record<string, any> : undefined };
}

/** Alice owns a Team workspace; Bob has an unrelated Free workspace. */
async function world() {
  const s = testServices();
  const alice = tokensFor("alice"), bob = tokensFor("bob");
  const aliceSession = await call(s, sessionHandler, request("/api/auth/session/", { tokens: alice }));
  const bobSession = await call(s, sessionHandler, request("/api/auth/session/", { tokens: bob }));
  const teamWs = aliceSession.body!.workspace.id as string;
  await s.directory.applyEntitlement(s.ledger, teamWs, { plan: "team", eventId: "evt_alice_team", occurredAt: 1 });
  return { s, alice, bob, teamWs, bobWs: bobSession.body!.workspace.id as string };
}

async function inviteAndJoin(w: Awaited<ReturnType<typeof world>>, sub: string) {
  const invite = await call(w.s, membersPostHandler, request("/api/workspace/members/", { tokens: w.alice, body: { email: `${sub}@example.com` } }));
  assert.equal(invite.status, 201);
  const token = new URL(invite.body!.inviteUrl).searchParams.get("token")!;
  const tokens = tokensFor(sub);
  const accepted = await call(w.s, acceptInviteHandler, request("/api/workspace/invitations/accept/", { tokens, body: { token } }));
  assert.equal(accepted.status, 200);
  return { tokens, token };
}

test("Team invitation email uses the existing verified invite token and does not reveal it in the response", async () => {
  const w = await world();
  const sent: { to: string; inviteLink: string; inviteId: string }[] = [];
  w.s.inviteEmail = async input => { sent.push(input); };
  const invited = await call(w.s, membersPostHandler, request("/api/workspace/members/", {
    tokens: w.alice, body: { email: "casey@example.com" },
  }));
  assert.equal(invited.status, 201);
  assert.equal(invited.body?.delivery, "email");
  assert.equal(invited.body?.inviteUrl, undefined);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "casey@example.com");
  assert.equal(new URL(sent[0].inviteLink).origin, "https://aria.test");
  assert.ok(sent[0].inviteId);
  const token = new URL(sent[0].inviteLink).searchParams.get("token");
  const accepted = await call(w.s, acceptInviteHandler, request("/api/workspace/invitations/accept/", {
    tokens: tokensFor("casey"), body: { token },
  }));
  assert.equal(accepted.status, 200);
});

test("failed Team invitation email releases the pending seat and invalidates the link", async () => {
  const w = await world();
  let failedLink = "";
  w.s.inviteEmail = async input => { failedLink = input.inviteLink; throw new Error("provider secret"); };
  const before = await w.s.directory.getWorkspace(w.teamWs);
  const invited = await call(w.s, membersPostHandler, request("/api/workspace/members/", {
    tokens: w.alice, body: { email: "casey@example.com" },
  }));
  assert.equal(invited.status, 502);
  assert.equal(invited.body?.code, "invite_email_failed");
  assert.equal(JSON.stringify(invited.body).includes("provider secret"), false);
  const after = await w.s.directory.getWorkspace(w.teamWs);
  assert.equal(after?.seatsUsed, before?.seatsUsed);
  const retry = await call(w.s, membersPostHandler, request("/api/workspace/members/", {
    tokens: w.alice, body: { email: "casey@example.com" },
  }));
  assert.equal(retry.status, 502);
  const accept = await call(w.s, acceptInviteHandler, request("/api/workspace/invitations/accept/", {
    tokens: tokensFor("casey"), body: { token: new URL(failedLink).searchParams.get("token") },
  }));
  assert.equal(accept.status, 404);
});

test("token verification rejects forged, expired, wrong-client, wrong-issuer, and swapped tokens", async () => {
  const verifier = cognitoVerifier({ userPoolId: POOL, clientId: CLIENT, jwks: JWKS });
  const ok = await verifier.verify(tokensFor("alice"));
  assert.equal(ok.sub, "alice");
  assert.equal(ok.emailVerified, true);
  const cases: [string, Parameters<typeof verifier.verify>[0], string][] = [
    ["forged signature", tokensFor("alice", { key: attackerKey }), "invalid_session"],
    ["expired", tokensFor("alice", { expiresIn: -60 }), "session_expired"],
    ["wrong client", tokensFor("alice", { clientId: "other-client" }), "invalid_session"],
    ["wrong issuer", tokensFor("alice", { issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Other" }), "invalid_session"],
    ["id token used as access token", { accessToken: tokensFor("alice").idToken, idToken: tokensFor("alice").idToken }, "invalid_session"],
    ["mismatched subjects", { accessToken: tokensFor("alice").accessToken, idToken: tokensFor("mallory").idToken }, "invalid_session"],
    ["missing ID token", { accessToken: tokensFor("alice").accessToken }, "not_signed_in"],
    ["garbage", { accessToken: "a.b.c", idToken: "d.e.f" }, "invalid_session"],
  ];
  for (const [label, tokens, code] of cases) {
    await assert.rejects(verifier.verify(tokens), { code }, label);
  }
});

test("unauthenticated, forged, and cross-site requests are rejected before any accounting", async () => {
  const s = testServices();
  assert.equal((await call(s, usageHandler, request("/api/usage/"))).status, 401);
  assert.equal((await call(s, chat, request("/api/chat/", { body: chatBody("anon_request") }))).status, 401);
  const forged = tokensFor("alice", { key: attackerKey });
  assert.equal((await call(s, usageHandler, request("/api/usage/", { tokens: forged }))).body?.code, "invalid_session");
  const alice = tokensFor("alice");
  for (const origin of [null, "https://evil.example"]) {
    const r = await call(s, chat, request("/api/chat/", { tokens: alice, origin, body: chatBody("csrf_request") }));
    assert.equal(r.body?.code, "invalid_origin");
  }
  assert.equal(s.store.dump().filter(i => i.sk.startsWith("REQ#")).length, 0);
  assert.equal(providerCalls, 0);
});

test("production chat stays disabled until the operator switch is set, even with identity and ledger", async () => {
  const s = testServices({ liveChat: false });
  const r = await call(s, chat, request("/api/chat/", { tokens: tokensFor("alice"), body: chatBody("disabled_req") }));
  assert.equal(r.status, 503);
  assert.equal(r.body?.code, "live_service_not_configured");
  assert.equal((await call(s, usageHandler, request("/api/usage/", { tokens: tokensFor("alice") }))).status, 200);
});

test("sign-in sets HttpOnly secure cookies and provisions a server-owned Free workspace", async () => {
  const s = testServices();
  const bad = await call(s, signInHandler, request("/api/auth/sign-in/", { body: { email: "alice@example.com", password: "nope" } }));
  assert.equal(bad.status, 401);
  const good = await call(s, signInHandler, request("/api/auth/sign-in/", { body: { email: "alice@example.com", password: "correct horse battery" } }));
  assert.equal(good.status, 200);
  const cookies = good.response.headers.getSetCookie();
  assert.equal(cookies.length, 3);
  assert.ok(cookies.every(c => c.includes("HttpOnly") && c.includes("Secure") && c.includes("SameSite=Lax")));
  assert.ok(cookies.some(c => c.startsWith("__Secure-aria_rt=") && c.includes("Path=/api/auth/")));
  const session = await call(s, sessionHandler, request("/api/auth/session/", { tokens: tokensFor("alice") }));
  assert.equal(session.body?.workspace.plan, "free");
  assert.equal(session.body?.workspace.role, "owner");
  assert.deepEqual(session.body?.entitlements.models, ["nova"]);
  const usage = await call(s, usageHandler, request("/api/usage/", { tokens: tokensFor("alice") }));
  assert.equal(usage.body?.included, 200);
});

test("browser-supplied plan, balance, and workspace claims grant nothing", async () => {
  const w = await world();
  const r = await call(w.s, chat, request("/api/chat/", { tokens: w.bob,
    body: chatBody("claims_req", { model: "claude", plan: "team", credits: 1e9, role: "owner", workspaceId: w.teamWs }) }));
  assert.equal(r.body?.code, "model_not_in_plan");
  const usage = await call(w.s, usageHandler, request("/api/usage/", { tokens: w.bob }));
  assert.equal(usage.body?.plan, "free");
  assert.equal(usage.body?.workspaceId, w.bobWs);
});

test("cross-team access: an outsider cannot read, spend, or administer another workspace", async () => {
  const w = await world();
  const asBob = { tokens: w.bob, workspace: w.teamWs };
  assert.equal((await call(w.s, usageHandler, request("/api/usage/", asBob))).status, 404);
  assert.equal((await call(w.s, sessionHandler, request("/api/auth/session/", asBob))).status, 404);
  assert.equal((await call(w.s, membersGetHandler, request("/api/workspace/members/", asBob))).status, 404);
  assert.equal((await call(w.s, membersPostHandler, request("/api/workspace/members/", { ...asBob, body: { email: "x@example.com" } }))).status, 404);
  assert.equal((await call(w.s, membersDeleteHandler, request("/api/workspace/members/", { ...asBob, method: "DELETE", body: { id: "alice" } }))).status, 404);
  const before = await w.s.ledger.balance(w.teamWs);
  assert.equal((await call(w.s, chat, request("/api/chat/", { ...asBob, body: chatBody("cross_team_req") }))).status, 404);
  assert.deepEqual(await w.s.ledger.balance(w.teamWs), before);
  // The same request ID in two workspaces is two independent requests.
  await (await run(request("/api/chat/", { tokens: w.alice, body: chatBody("shared_id_1") }), chat, w.s)).text();
  assert.equal(await w.s.ledger.find(w.bobWs, "shared_id_1"), undefined);
  assert.equal((await call(w.s, membersGetHandler, request("/api/workspace/members/", { tokens: w.alice }))).body?.members.length, 1);
});

test("invited members share the Team pool; members cannot administer", async () => {
  const w = await world();
  const carol = await inviteAndJoin(w, "carol");
  const session = await call(w.s, sessionHandler, request("/api/auth/session/", { tokens: carol.tokens }));
  assert.equal(session.body?.workspace.id, w.teamWs, "accepting selects the team workspace");
  assert.equal(session.body?.workspace.role, "member");
  const before = (await w.s.ledger.balance(w.teamWs)).used;
  const events = await sse(await run(request("/api/chat/", { tokens: carol.tokens, workspace: w.teamWs, body: chatBody("carol_req_1", { model: "claude" }) }), chat, w.s));
  assert.equal(events.at(-1)?.type, "RUN_FINISHED");
  assert.ok((await w.s.ledger.balance(w.teamWs)).used > before);
  const invite = await call(w.s, membersPostHandler, request("/api/workspace/members/", { tokens: carol.tokens, workspace: w.teamWs, body: { email: "x@example.com" } }));
  assert.equal(invite.body?.code, "permission_denied");
  const remove = await call(w.s, membersDeleteHandler, request("/api/workspace/members/", { tokens: carol.tokens, workspace: w.teamWs, method: "DELETE", body: { id: "alice" } }));
  assert.equal(remove.body?.code, "permission_denied");
});

test("invitations are bound to the verified invited email, single-use, revocable, and expire", async () => {
  const w = await world();
  const invite = await call(w.s, membersPostHandler, request("/api/workspace/members/", { tokens: w.alice, body: { email: "dana@example.com" } }));
  const token = new URL(invite.body!.inviteUrl).searchParams.get("token")!;
  assert.equal(w.s.store.dump().some(i => JSON.stringify(i).includes(token)), false, "plaintext token is never stored");
  const accept = (tokens: ReturnType<typeof tokensFor>, t = token) =>
    call(w.s, acceptInviteHandler, request("/api/workspace/invitations/accept/", { tokens, body: { token: t } }));
  assert.equal((await accept(w.bob)).body?.code, "invite_email_mismatch");
  assert.equal((await accept(tokensFor("dana", { emailVerified: false }))).body?.code, "invite_email_mismatch");
  assert.equal((await accept(tokensFor("dana"))).status, 200);
  assert.equal((await accept(tokensFor("dana"))).body?.code, "invite_not_found", "single use");
  const second = await call(w.s, membersPostHandler, request("/api/workspace/members/", { tokens: w.alice, body: { email: "erin@example.com" } }));
  const members = await call(w.s, membersGetHandler, request("/api/workspace/members/", { tokens: w.alice }));
  const pending = members.body!.members.find((m: { email: string }) => m.email === "erin@example.com");
  await call(w.s, membersDeleteHandler, request("/api/workspace/members/", { tokens: w.alice, method: "DELETE", body: { id: pending.id } }));
  assert.equal((await accept(tokensFor("erin"), new URL(second.body!.inviteUrl).searchParams.get("token")!)).body?.code, "invite_not_found");
});

test("expired invitations cannot be accepted", async () => {
  const env = ledgerEnv();
  const owner = await env.directory.ensureAccount(identity("owner"));
  await env.directory.applyEntitlement(env.ledger, owner.personalWorkspaceId, { plan: "team", eventId: "evt_team", occurredAt: 1 });
  const invite = await env.directory.invite((await env.directory.getMembership(owner.personalWorkspaceId, "owner"))!, "fay@example.com");
  env.time.advance(INVITE_TTL_MS + 1);
  const fay = identity("fay");
  await assert.rejects(env.directory.acceptInvite(fay, await env.directory.ensureAccount(fay), invite.token), { code: "invite_expired" });
});

test("seat limits and plan gating apply to invitations", async () => {
  const w = await world();
  for (const sub of ["s1", "s2", "s3", "s4"]) {
    assert.equal((await call(w.s, membersPostHandler, request("/api/workspace/members/", { tokens: w.alice, body: { email: `${sub}@example.com` } }))).status, 201);
  }
  const full = await call(w.s, membersPostHandler, request("/api/workspace/members/", { tokens: w.alice, body: { email: "s5@example.com" } }));
  assert.equal(full.body?.code, "seats_exhausted");
  const dup = await call(w.s, membersPostHandler, request("/api/workspace/members/", { tokens: w.alice, body: { email: "alice@example.com" } }));
  assert.ok(["already_invited_or_member", "seats_exhausted"].includes(dup.body?.code));
  const free = await call(w.s, membersPostHandler, request("/api/workspace/members/", { tokens: w.bob, body: { email: "z@example.com" } }));
  assert.equal(free.body?.code, "plan_required");
});

test("revoked members lose access immediately, including on their next request mid-session", async () => {
  const w = await world();
  const carol = await inviteAndJoin(w, "carol");
  const asCarol = { tokens: carol.tokens, workspace: w.teamWs };
  assert.equal((await call(w.s, usageHandler, request("/api/usage/", asCarol))).status, 200);
  const removed = await call(w.s, membersDeleteHandler, request("/api/workspace/members/", { tokens: w.alice, method: "DELETE", body: { id: "carol" } }));
  assert.equal(removed.status, 200);
  assert.equal((await call(w.s, usageHandler, request("/api/usage/", asCarol))).body?.code, "access_revoked");
  assert.equal((await call(w.s, chat, request("/api/chat/", { ...asCarol, body: chatBody("after_revoke") }))).body?.code, "access_revoked");
  assert.equal(await w.s.ledger.find(w.teamWs, "after_revoke"), undefined);
  // Without an explicit workspace, Carol falls back to her own Free workspace, never the team pool.
  const fallback = await call(w.s, usageHandler, request("/api/usage/", { tokens: carol.tokens }));
  assert.notEqual(fallback.body?.workspaceId, w.teamWs);
  assert.equal(fallback.body?.plan, "free");
  const seats = await call(w.s, membersGetHandler, request("/api/workspace/members/", { tokens: w.alice }));
  assert.equal(seats.body?.workspace.seatsUsed, 1);
});

test("a member removed while a response is streaming is still charged for the delivered answer, then blocked", async () => {
  const w = await world();
  const carol = await inviteAndJoin(w, "carol");
  let release!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  const slow = chatHandler({ modelConfig: m => ({ id: m, rates }), maxOutputTokens: 256,
    provider: async function* () { yield { text: "part" }; await gate; yield { usage: { inputTokens: 10, outputTokens: 10 } }; } });
  const response = await run(request("/api/chat/", { tokens: carol.tokens, workspace: w.teamWs, body: chatBody("mid_stream") }), slow, w.s);
  const body = response.text();
  await w.s.directory.removeMember((await w.s.directory.getMembership(w.teamWs, "alice"))!, "carol");
  release();
  assert.match(await body, /RUN_FINISHED/);
  assert.equal((await w.s.ledger.find(w.teamWs, "mid_stream"))?.status, "completed");
  assert.equal((await call(w.s, chat, request("/api/chat/", { tokens: carol.tokens, workspace: w.teamWs, body: chatBody("mid_stream_2") }))).status, 403);
});

test("sign-out revokes every outstanding token and refresh, and clears cookies", async () => {
  const s = testServices();
  const tokens = tokensFor("alice", { authTime: Math.floor(Date.now() / 1000) - 5 });
  assert.equal((await call(s, usageHandler, request("/api/usage/", { tokens }))).status, 200);
  const out = await call(s, signOutHandler, request("/api/auth/sign-out/", { tokens, body: {} }));
  assert.equal(out.status, 200);
  assert.ok(out.response.headers.getSetCookie().every(c => c.includes("Max-Age=0")));
  const reused = await call(s, usageHandler, request("/api/usage/", { tokens }));
  assert.equal(reused.body?.code, "session_revoked");
  assert.ok(reused.response.headers.getSetCookie().length > 0, "dead cookies are cleared");
  const refreshed = await call(s, refreshHandler, request("/api/auth/refresh/", { tokens, body: {} }));
  assert.equal(refreshed.status, 401);
});

test("disabled accounts are rejected even with a valid token", async () => {
  const s = testServices();
  const tokens = tokensFor("alice");
  await call(s, usageHandler, request("/api/usage/", { tokens }));
  await s.directory.setUserStatus("alice", "disabled");
  assert.equal((await call(s, usageHandler, request("/api/usage/", { tokens }))).body?.code, "account_disabled");
});

test("billing events are idempotent, ordered, and top up an upgrade exactly once", async () => {
  const w = await world();
  const ws = w.bobWs;
  const apply = (plan: "free" | "pro" | "team", eventId: string, occurredAt: number) =>
    w.s.directory.applyEntitlement(w.s.ledger, ws, { plan, eventId, occurredAt });
  assert.equal(await apply("pro", "evt_1", 10), "applied");
  assert.equal(await apply("pro", "evt_1", 10), "duplicate");
  assert.equal((await w.s.ledger.balance(ws)).included, 6000);
  assert.equal(await apply("free", "evt_0_late", 5), "stale", "older event delivered late is ignored");
  assert.equal((await w.s.directory.getWorkspace(ws))?.plan, "pro");
  assert.equal(await apply("free", "evt_2", 20), "applied");
  assert.equal((await w.s.ledger.balance(ws)).included, 6000, "downgrade does not claw back this period");
  const usage = await call(w.s, usageHandler, request("/api/usage/", { tokens: w.bob }));
  assert.equal(usage.body?.plan, "free");
});
