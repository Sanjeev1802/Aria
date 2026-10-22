import { ServiceError } from "./errors";
import { errorResponse } from "./http-error";
import { parseChatInput, type ChatInput } from "./chat-input";
import { createChatResponse, type StreamProvider } from "./chat-service";
import { requireModel, isRole, PLANS } from "./accounts/entitlements";
import { assertAccountsConfigured, assertChatEnabled, getServices, type Services } from "./services";
import { assertSameOrigin, authenticate, requireWorkspace } from "./request-context";
import { clearSessionCookies, readSessionTokens, sessionCookies, withCookies } from "./auth/cookies";
import { unverifiedSubject } from "./auth/verifier";
import { LOCAL_ACCOUNT_COOKIE } from "@/lib/local-user-shared";
import { LocalIdentityProvider } from "./auth/local-identity-provider";
import { LOCAL_DEV_USER_LABELS, LOCAL_USER_COOKIE, resolveLocalUser } from "./local-dev";
import type { Rates } from "./metering";
import { prepareThreadRun } from "./threads";
import type { WebSearchProvider } from "./web-search";

export type ChatDeps = {
  provider: StreamProvider;
  modelConfig: (model: ChatInput["model"]) => { id: string; rates: Rates };
  maxOutputTokens: number;
  searchWeb?: WebSearchProvider;
};

const noStore = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore });

/** Wraps a handler with service resolution and uniform error responses. */
export async function run(request: Request, handler: (request: Request, services: Services) => Promise<Response>, services?: Services) {
  try { return await handler(request, services ?? getServices()); }
  catch (error) {
    const response = errorResponse(error);
    // A dead session should not keep sending cookies that will fail again.
    if (error instanceof ServiceError && ["session_revoked", "invalid_session", "account_disabled"].includes(error.code)) {
      try { withCookies(response, clearSessionCookies((services ?? getServices()).config.secureCookies)); } catch { /* unconfigured */ }
    }
    return response;
  }
}

export async function readJson(request: Request, limit = 16_000): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new ServiceError("missing_body", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new ServiceError("request_too_large", 413); }
    chunks.push(value);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { throw new ServiceError("invalid_json", 400); }
}

const str = (value: unknown, max = 320) => typeof value === "string" && value.length <= max ? value : "";

export function chatHandler(deps: ChatDeps) {
  return async (request: Request, s: Services) => {
    assertChatEnabled(s.config);
    const ctx = await requireWorkspace(request, s, "chat");
    let input: ChatInput;
    const body = await readJson(request, 128_000);
    try { input = parseChatInput(body); }
    catch (error) { return json({ code: "invalid_request", message: error instanceof Error ? error.message : "Invalid request" }, 400); }
    // Every plan uses Bedrock Nova; a browser-provided model remains plan-gated.
    if (body.model === undefined) input = { ...input, model: "nova" };
    if (body.webSearch !== undefined && typeof body.webSearch !== "boolean") return json({ code: "invalid_request", message: "Invalid web search option" }, 400);
    if (body.webSearch && (!s.config.searxngUrl || !deps.searchWeb)) return json({ code: "web_search_unavailable", message: "Public web search is not configured on this server." }, 503);
    requireModel(ctx.plan, input.model);
    const onComplete = body.threadId === undefined ? undefined : await prepareThreadRun(s, ctx, body.threadId, input);
    const model = deps.modelConfig(input.model);
    await s.ledger.ensurePeriodGrant(ctx.workspace.id, ctx.workspace.plan);
    return createChatResponse(input, {
      ledger: s.ledger, account: { workspaceId: ctx.workspace.id, memberId: ctx.user.id, plan: ctx.workspace.plan },
      modelId: model.id, rates: model.rates, provider: deps.provider, signal: request.signal, maxOutputTokens: deps.maxOutputTokens,
      webSearch: body.webSearch ? deps.searchWeb : undefined,
      onComplete,
    });
  };
}

export async function usageHandler(request: Request, s: Services) {
  const ctx = await requireWorkspace(request, s, "usage:read");
  await s.ledger.ensurePeriodGrant(ctx.workspace.id, ctx.workspace.plan);
  const balance = await s.ledger.balance(ctx.workspace.id);
  return json({ ...balance, plan: ctx.plan.id, planLabel: ctx.plan.label, workspaceId: ctx.workspace.id,
    activity: await s.ledger.activity(ctx.workspace.id, ctx.user.id) });
}

export async function sessionHandler(request: Request, s: Services) {
  const ctx = await requireWorkspace(request, s, "usage:read");
  const workspaces = await s.directory.listWorkspaces(ctx.user.id);
  const local = s.config.localIdentity ? resolveLocalUser(request) : undefined;
  return json({
    environment: s.config.environment,
    liveChat: s.config.liveChat || s.config.localIdentity,
    webSearchAvailable: Boolean(s.config.searxngUrl),
    localDev: Boolean(s.config.localIdentity),
    localUser: local?.slot,
    localUsers: s.config.localIdentity ? LOCAL_DEV_USER_LABELS : undefined,
    user: { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name, avatar: await s.directory.getAvatar(ctx.user.id) },
    workspace: { id: ctx.workspace.id, name: ctx.workspace.name, plan: ctx.plan.id, planLabel: ctx.plan.label,
      role: ctx.membership.role, seatLimit: ctx.workspace.seatLimit, seatsUsed: ctx.workspace.seatsUsed },
    entitlements: { models: ctx.plan.models, apiAccess: ctx.plan.apiAccess, teamManagement: ctx.plan.teamManagement,
      monthlyCredits: ctx.plan.monthlyUnits / 1000 },
    workspaces: workspaces.map(w => ({ id: w.id, name: w.name, plan: w.plan, planLabel: PLANS[w.plan].label, role: w.role })),
  });
}

export async function selectWorkspaceHandler(request: Request, s: Services) {
  const { user } = await authenticate(request, s);
  const body = await readJson(request);
  const workspace = await s.directory.selectWorkspace(user, str(body.workspaceId, 100));
  return json({ workspaceId: workspace.id });
}

export async function membersGetHandler(request: Request, s: Services) {
  const ctx = await requireWorkspace(request, s, "members:read");
  const workspace = await s.directory.getWorkspace(ctx.workspace.id);
  return json({
    workspace: { id: ctx.workspace.id, name: ctx.workspace.name, seatLimit: workspace?.seatLimit, seatsUsed: workspace?.seatsUsed },
    selfId: ctx.user.id, role: ctx.membership.role,
    members: await Promise.all((await s.directory.members(ctx.workspace.id)).map(async member => member.status === "active" &&
      (ctx.membership.role !== "member" || member.id === ctx.user.id)
      ? { ...member, budget: await s.ledger.memberBudget(ctx.workspace.id, member.id) } : member)),
  });
}

export async function membersPatchHandler(request: Request, s: Services) {
  const ctx = await requireWorkspace(request, s, "members:invite");
  if (ctx.workspace.plan !== "team") throw new ServiceError("plan_required", 403);
  const body = await readJson(request);
  const id = str(body.id, 120);
  if (!id) throw new ServiceError("member_not_found", 404);
  const target = await s.directory.getMembership(ctx.workspace.id, id);
  if (!target) throw new ServiceError("member_not_found", 404);
  if (ctx.membership.role !== "owner" && (target.role !== "member" || id === ctx.user.id)) {
    throw new ServiceError("permission_denied", 403);
  }
  const credits = body.limit;
  if (credits !== null && (typeof credits !== "number" || !Number.isInteger(credits) || credits < 0 ||
      credits > PLANS.team.monthlyUnits / 1000)) throw new ServiceError("invalid_member_limit", 400);
  const budget = await s.ledger.setMemberLimit(ctx.workspace.id, ctx.user.id, ctx.membership.role,
    id, target.role, credits === null ? null : credits * 1000);
  return json({ budget });
}

export async function membersPostHandler(request: Request, s: Services) {
  const ctx = await requireWorkspace(request, s, "members:invite");
  const body = await readJson(request);
  const role = isRole(body.role) ? body.role : "member";
  const invite = await s.directory.invite(ctx.membership, str(body.email), role);
  const origin = s.config.appOrigin ?? new URL(request.url).origin;
  const inviteUrl = `${origin}/invite/?token=${invite.token}`;
  if (s.inviteEmail) {
    try {
      const email = str(body.email).trim().toLowerCase();
      await s.inviteEmail({ to: email, inviteeName: email.split("@")[0], inviteLink: inviteUrl, inviteId: invite.inviteId });
    } catch {
      // A failed delivery must not occupy a seat or leave an unusable pending invitation.
      await s.directory.revokeInvite(ctx.membership, invite.inviteId);
      throw new ServiceError("invite_email_failed", 502);
    }
    return json({ delivery: "email", expiresAt: invite.expiresAt }, 201);
  }
  // Local/manual fallback: shown once to the inviting admin; only a hash is stored.
  return json({ delivery: "link", inviteUrl, expiresAt: invite.expiresAt }, 201);
}

export async function membersDeleteHandler(request: Request, s: Services) {
  const ctx = await requireWorkspace(request, s, "members:read");
  const body = await readJson(request);
  const id = str(body.id, 120);
  if (id.startsWith("invite_")) await s.directory.revokeInvite(ctx.membership, id.slice(7));
  else await s.directory.removeMember(ctx.membership, id);
  return json({ ok: true });
}

export async function acceptInviteHandler(request: Request, s: Services) {
  const { identity, user } = await authenticate(request, s);
  const body = await readJson(request);
  const workspaceId = await s.directory.acceptInvite(identity, user, str(body.token, 200));
  return json({ workspaceId });
}

function requireIdp(s: Services) {
  if (!s.idp) throw new ServiceError("live_service_not_configured", 503);
  if (!s.verifier) throw new ServiceError("live_service_not_configured", 503);
  return { idp: s.idp, verifier: s.verifier };
}

function requireAnyIdp(s: Services) {
  if (!s.idp) throw new ServiceError("live_service_not_configured", 503);
  return s.idp;
}

function localAccountCookie(email: string) {
  return `${LOCAL_ACCOUNT_COOKIE}=${encodeURIComponent(email.trim().toLowerCase())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;
}

function clearLocalAuthCookies() {
  return [
    `${LOCAL_ACCOUNT_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    `${LOCAL_USER_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`,
  ];
}

/** Verifies freshly issued tokens and provisions the account before setting cookies. */
async function startSession(s: Services, tokens: { accessToken: string; idToken: string; refreshToken?: string }) {
  const identity = await s.verifier!.verify(tokens);
  const user = await s.directory.ensureAccount(identity);
  s.directory.assertSessionValid(user, identity);
  return withCookies(json({ ok: true }), sessionCookies(tokens, s.config.secureCookies));
}

export async function signInHandler(request: Request, s: Services) {
  assertAccountsConfigured(s.config);
  assertSameOrigin(request, s);
  const body = await readJson(request);
  const email = str(body.email), password = str(body.password, 256);
  if (!email || !password) throw new ServiceError("invalid_credentials", 401);
  if (s.config.localIdentity && s.idp instanceof LocalIdentityProvider) {
    await s.idp.signIn(email, password);
    const response = json({ ok: true, mode: "local" });
    return withCookies(response, [localAccountCookie(email)]);
  }
  const { idp } = requireIdp(s);
  return startSession(s, await idp.signIn(email, password));
}

export async function signUpHandler(request: Request, s: Services) {
  assertAccountsConfigured(s.config);
  assertSameOrigin(request, s);
  const body = await readJson(request);
  const email = str(body.email), password = str(body.password, 256);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) throw new ServiceError("invalid_auth_request", 400);
  const idp = requireAnyIdp(s);
  try {
    if (s.config.localIdentity && idp instanceof LocalIdentityProvider) {
      return json(await idp.signUp(email, password, str(body.name, 100)));
    }
    const { idp: cognitoIdp } = requireIdp(s);
    return json(await cognitoIdp.signUp(email, password, str(body.name, 100)));
  } catch (error) {
    if (!(error instanceof ServiceError) || error.code !== "account_exists") throw error;
    try {
      await idp.resendCode(email);
      return json({ confirmationRequired: true });
    } catch {
      throw error;
    }
  }
}

export async function confirmHandler(request: Request, s: Services) {
  assertAccountsConfigured(s.config);
  assertSameOrigin(request, s);
  const idp = requireAnyIdp(s);
  const body = await readJson(request);
  const email = str(body.email);
  if (body.resend === true) { await idp.resendCode(email); return json({ ok: true }); }
  const code = str(body.code, 10);
  if (!/^\d{4,10}$/.test(code)) throw new ServiceError("invalid_code", 400);
  await idp.confirmSignUp(email, code);
  return json({ ok: true });
}

export async function forgotPasswordHandler(request: Request, s: Services) {
  assertAccountsConfigured(s.config);
  assertSameOrigin(request, s);
  const idp = requireAnyIdp(s);
  const body = await readJson(request);
  const email = str(body.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ServiceError("invalid_email", 400);
  try {
    await idp.forgotPassword(email);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "password_reset_unavailable") {
      await idp.resendCode(email).catch(() => undefined);
      throw new ServiceError("account_not_confirmed", 403);
    }
    throw error;
  }
  return json({ ok: true });
}

export async function resetPasswordHandler(request: Request, s: Services) {
  assertAccountsConfigured(s.config);
  assertSameOrigin(request, s);
  const idp = requireAnyIdp(s);
  const body = await readJson(request);
  const email = str(body.email), code = str(body.code, 10), password = str(body.password, 256);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{4,10}$/.test(code) || password.length < 8) {
    throw new ServiceError("invalid_auth_request", 400);
  }
  await idp.confirmForgotPassword(email, code, password);
  return json({ ok: true });
}

export async function refreshHandler(request: Request, s: Services) {
  assertAccountsConfigured(s.config);
  assertSameOrigin(request, s);
  if (s.config.localIdentity && s.idp instanceof LocalIdentityProvider) return json({ ok: true, mode: "local" });
  const { idp } = requireIdp(s);
  const tokens = readSessionTokens(request, s.config.secureCookies);
  const subject = unverifiedSubject(tokens.idToken);
  if (!tokens.refreshToken || !subject) throw new ServiceError("not_signed_in", 401);
  const fresh = await idp.refresh(tokens.refreshToken, subject);
  return startSession(s, { ...fresh, refreshToken: fresh.refreshToken ?? tokens.refreshToken });
}

export async function signOutHandler(request: Request, s: Services) {
  assertAccountsConfigured(s.config);
  assertSameOrigin(request, s);
  const tokens = readSessionTokens(request, s.config.secureCookies);
  if (s.verifier && tokens.accessToken) {
    try {
      const identity = await s.verifier.verify(tokens);
      // Invalidates every outstanding token for this user, not only this browser's.
      await s.directory.revokeSessions(identity.sub);
    } catch { /* expired or invalid tokens: still revoke the refresh token and clear cookies */ }
  }
  if (s.idp && tokens.refreshToken) await s.idp.revoke(tokens.refreshToken);
  const clears = [...clearSessionCookies(s.config.secureCookies), ...clearLocalAuthCookies()];
  return withCookies(json({ ok: true }), clears);
}
