import { ServiceError } from "./errors";
import { authenticate } from "./request-context";
import { isPlanId, type PlanId } from "./accounts/entitlements";
import { seatLimitForPlan } from "./subscription-catalog";
import { ConditionFailed, notExists } from "./store/types";
import type { ServerConfig, Services } from "./services";
import { claudeConfigured, DEFAULT_CLAUDE_MODEL } from "./claude-config";
import { readModelUsage, type ModelProvider } from "./model-usage";
import { internalAuditReasonForSource, INTERNAL_AUDIT_SOURCE_AI_ACCESS } from "@/lib/internal-audit-copy";
import { isLocalDevFixtureUserId } from "@/lib/local-user-shared";

const auditKey = (id: string) => ({ pk: "ADMIN#AUDIT", sk: `ACTION#${id}` });
const validId = (value: unknown) => typeof value === "string" && /^[\w:.-]{1,128}$/.test(value);
/**
 * ARIA Team roles. `super_admin` is set on the server. `admin` can see everything and can change
 * everything once a super admin grants edit access; `member` is view-only; `billing` and `operations`
 * are scoped to those jobs. `support` is the older name for a view-only member.
 */
export type InternalRole = "super_admin" | "admin" | "member" | "support" | "billing" | "operations";

async function mapBatches<T, R>(items: T[], task: (item: T) => Promise<R>, size = 20): Promise<R[]> {
  const output: R[] = [];
  for (let at = 0; at < items.length; at += size) output.push(...await Promise.all(items.slice(at, at + size).map(task)));
  return output;
}

function subjectRole(services: Services, subject: string): InternalRole | undefined {
  if (services.config.adminSubjects?.includes(subject)) return "super_admin";
  return services.config.adminRoles?.[subject];
}

const operatorKey = (email: string) => ({ pk: "ADMIN#OPERATORS", sk: `EMAIL#${email}` });
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Roles a super admin can hand out from the console; super_admin itself stays server-configured. */
export const GRANTABLE_ROLES = ["admin", "member", "support", "billing", "operations"] as const;
export type GrantableRole = typeof GRANTABLE_ROLES[number];

type Authenticated = Awaited<ReturnType<typeof authenticate>>;

export type InternalAccess = { role: InternalRole; canEdit: boolean };

/** Full edit access: super admins always, admins only when a super admin turned it on. */
export const hasFullAccess = (role: InternalRole, canEdit: boolean) => role === "super_admin" || (role === "admin" && canEdit);

/**
 * The operator role and edit access for an authenticated user, or undefined for customers.
 * Order: configured super admins and scoped roles, development-only allowlists,
 * then access a super admin granted from the console (bound to a verified email).
 */
export async function resolveInternalAccess(services: Services, auth: Authenticated): Promise<InternalAccess | undefined> {
  const localPreview = services.config.environment === "development" && services.config.localIdentity &&
    services.config.adminLocalDev && auth.user.id === "local-alex";
  let role: InternalRole | undefined = localPreview ? "super_admin" : subjectRole(services, auth.user.id);
  if (!role && services.config.environment === "development" && services.config.adminLocalDev &&
    auth.identity.emailVerified) {
    const email = auth.user.email.trim().toLowerCase();
    if (services.config.adminEmails?.includes(email)) {
      role = "super_admin";
    } else {
      const subjects = [
        ...(services.config.adminSubjects ?? []),
        ...Object.keys(services.config.adminRoles ?? {}),
      ];
      for (const subject of subjects) {
        if (subject === auth.user.id) continue;
        const operator = await services.directory.getUser(subject);
        if (operator?.email.trim().toLowerCase() === email) {
          role = subjectRole(services, subject);
          break;
        }
      }
    }
  }
  if (role) return { role, canEdit: role === "super_admin" };
  if (auth.identity.emailVerified) {
    const grant = await services.store.get(operatorKey(auth.user.email.trim().toLowerCase()));
    if (grant && (GRANTABLE_ROLES as readonly string[]).includes(String(grant.role))) {
      return { role: grant.role as InternalRole, canEdit: grant.role === "admin" && grant.canEdit === true };
    }
  }
  return undefined;
}

export async function resolveInternalRole(services: Services, auth: Authenticated): Promise<InternalRole | undefined> {
  return (await resolveInternalAccess(services, auth))?.role;
}

/**
 * Internal operator access is bound to verified Cognito subjects, never a workspace role.
 * In local preview only, a Cognito sign-in is granted when its verified email already belongs
 * to an allowlisted operator (so demo operators keep access after signing in with Cognito).
 */
export async function requireInternalAdmin(request: Request, services: Services) {
  const auth = await authenticate(request, services);
  const access = await resolveInternalAccess(services, auth);
  if (!access) {
    throw new ServiceError("admin_access_denied", 403);
  }
  return { ...auth, internalRole: access.role, internalCanEdit: access.canEdit };
}

export function assertAdminActionAllowed(role: InternalRole, type: AdminAction["type"], canEdit = false) {
  if (hasFullAccess(role, canEdit)) return;
  if (role === "billing" && ["set_plan", "grant_credits"].includes(type)) return;
  if (role === "operations" && ["disable_user", "revoke_sessions"].includes(type)) return;
  throw new ServiceError("admin_action_forbidden", 403);
}

export async function adminOverview(services: Services) {
  const [userKeys, workspaceKeys, auditKeys] = await Promise.all([
    services.store.queryIndex("gsi2", "ADMIN#USERS", { limit: 500 }),
    services.store.queryIndex("gsi2", "ADMIN#WORKSPACES", { limit: 500 }),
    services.store.queryIndex("gsi2", "ADMIN#AUDIT", { limit: 12 }),
  ]);
  const audit = (await Promise.all(auditKeys.map(row => services.store.get({ pk: String(row.pk), sk: String(row.sk) }))))
    .filter(row => row !== undefined);
  const users = (await mapBatches(userKeys, row => services.directory.getUser(String(row.pk).slice(5))))
    .filter(<T extends { id: string }>(user: T | undefined): user is T => user !== undefined && !isLocalDevFixtureUserId(user.id))
    .map(user => ({ id: user.id, email: user.email, name: user.name, status: user.status,
      aiAccessSuspended: user.aiAccessSuspended, personalWorkspaceId: user.personalWorkspaceId }));
  const workspaces = (await mapBatches(workspaceKeys, async row => {
    const workspace = await services.directory.getWorkspace(String(row.pk).slice(3));
    if (!workspace) return undefined;
    const balance = await services.ledger.balance(workspace.id);
    return { ...workspace, credits: balance };
  }))
    .filter(<T extends { ownerId: string }>(workspace: T | undefined): workspace is T =>
      workspace !== undefined && !isLocalDevFixtureUserId(workspace.ownerId));
  return {
    users, workspaces,
    summary: {
      users: users.length, workspaces: workspaces.length,
      activeUsers: users.filter(user => user.status === "active").length,
      teamWorkspaces: workspaces.filter(workspace => workspace.plan === "team").length,
      creditsUsed: workspaces.reduce((sum, workspace) => sum + workspace.credits.used, 0),
    },
    activity: audit.map(row => ({ id: String(row.sk).slice(7), action: String(row.action),
      actorId: String(row.actorId), targetId: String(row.targetId), reason: String(row.reason),
      at: Number(row.at), result: String(row.result), ...(typeof row.credits === "number" ? { credits: row.credits } : {}) })),
    limited: userKeys.length === 500 || workspaceKeys.length === 500,
  };
}

export async function adminCustomer(services: Services, userId: string) {
  if (!validId(userId)) throw new ServiceError("admin_invalid_target", 400);
  const user = await services.directory.getUser(userId);
  if (!user) throw new ServiceError("admin_customer_not_found", 404);
  const workspaces = await Promise.all((await services.directory.listWorkspaces(user.id)).map(async workspace => ({
    ...workspace, credits: await services.ledger.balance(workspace.id),
    members: await services.directory.members(workspace.id),
  })));
  return { user, workspaces };
}

export type AdminAction = {
  id: string; type: "disable_user" | "enable_user" | "revoke_sessions" | "set_plan" | "grant_credits";
  targetId: string; reason: string; plan?: PlanId; credits?: number;
};

export function parseAdminAction(body: Record<string, unknown>): AdminAction {
  const type = String(body.type);
  if (!validId(body.id) || !validId(body.targetId) ||
    !["disable_user", "enable_user", "revoke_sessions", "set_plan", "grant_credits"].includes(type) ||
    (type === "set_plan" && !isPlanId(body.plan)) ||
    (type === "grant_credits" && (typeof body.credits !== "number" || !Number.isSafeInteger(body.credits * 1000) ||
      body.credits <= 0 || body.credits > 100))) throw new ServiceError("admin_invalid_action", 400);

  const source = body.source === INTERNAL_AUDIT_SOURCE_AI_ACCESS ? INTERNAL_AUDIT_SOURCE_AI_ACCESS : undefined;
  let reason: string | undefined;
  if (source === INTERNAL_AUDIT_SOURCE_AI_ACCESS) {
    if (type !== "disable_user" && type !== "enable_user") throw new ServiceError("admin_invalid_action", 400);
    reason = internalAuditReasonForSource(type, source);
  } else if (typeof body.reason === "string") {
    reason = body.reason.trim();
  }
  if (!reason || reason.length < 8 || reason.length > 500) throw new ServiceError("admin_invalid_action", 400);

  return { id: body.id as string, targetId: body.targetId as string, reason,
    type: type as AdminAction["type"], ...(isPlanId(body.plan) ? { plan: body.plan } : {}),
    ...(type === "grant_credits" ? { credits: body.credits as number } : {}) };
}

export async function executeAdminAction(services: Services, actorId: string, action: AdminAction) {
  const key = auditKey(action.id);
  const prior = await services.store.get(key);
  if (prior) {
    if (prior.actorId !== actorId || prior.action !== action.type || prior.targetId !== action.targetId ||
      prior.reason !== action.reason || prior.plan !== (action.plan ?? undefined) ||
      prior.credits !== (action.credits ?? undefined)) throw new ServiceError("admin_action_conflict", 409);
    return { result: "duplicate" as const };
  }
  if (action.targetId === actorId && !["set_plan", "grant_credits"].includes(action.type)) throw new ServiceError("admin_self_action", 403);
  const now = Date.now();
  const audit = { ...key, gsi2pk: "ADMIN#AUDIT", gsi2sk: `${String(Number.MAX_SAFE_INTEGER - now).padStart(16, "0")}#${action.id}`,
    action: action.type, actorId, targetId: action.targetId,
    reason: action.reason, ...(action.plan ? { plan: action.plan } : {}),
    ...(action.credits ? { credits: action.credits } : {}), at: now, result: "applied" };
  if (action.type === "grant_credits") {
    const workspace = await services.directory.getWorkspace(action.targetId);
    if (!workspace) throw new ServiceError("workspace_not_found", 404);
    if (workspace.ownerId === actorId) throw new ServiceError("admin_self_action", 403);
    const period = await services.ledger.ensurePeriodGrant(workspace.id, workspace.plan);
    try {
      await services.store.transact([
        { kind: "check", key: { pk: `WS#${workspace.id}`, sk: "META" }, when: [{ field: "pk", op: "exists" }] },
        ...services.ledger.grantWrites(workspace.id, period, Math.round(action.credits! * 1000), `admin:${action.id}`),
        { kind: "put", item: audit, when: [notExists] },
      ]);
    } catch (error) {
      if (error instanceof ConditionFailed) throw new ServiceError("admin_action_conflict", 409);
      throw error;
    }
    return { result: "applied" as const };
  }
  if (action.type === "set_plan") {
    const workspace = await services.directory.getWorkspace(action.targetId);
    if (!workspace) throw new ServiceError("workspace_not_found", 404);
    const seatLimit = await seatLimitForPlan(services.store, action.plan!);
    if (workspace.seatsUsed > seatLimit) throw new ServiceError("admin_plan_seats_exceeded", 409);
    const result = await services.directory.applyEntitlement(services.ledger, action.targetId,
      { plan: action.plan!, eventId: `admin:${action.id}`, occurredAt: now });
    await services.store.transact([{ kind: "put", item: { ...audit, result }, when: [notExists] }]);
    return { result };
  }
  const user = await services.directory.getUser(action.targetId);
  if (!user) throw new ServiceError("admin_customer_not_found", 404);
  const update: Record<string, string | number | boolean> = action.type === "revoke_sessions"
    ? { sessionsRevokedAfter: Math.floor(now / 1000) }
    : action.type === "disable_user"
      ? { aiAccessSuspended: true, status: "active", signInBlocked: false }
      : { aiAccessSuspended: false, status: "active", signInBlocked: false };
  try {
    await services.store.transact([
      { kind: "update", key: { pk: `USER#${user.id}`, sk: "PROFILE" }, set: update,
        when: [{ field: "pk", op: "exists" }] },
      { kind: "put", item: audit, when: [notExists] },
    ]);
  } catch (error) {
    if (error instanceof ConditionFailed) throw new ServiceError("admin_action_conflict", 409);
    throw error;
  }
  return { result: "applied" as const };
}

export type OperatorGrant = { email: string; role: GrantableRole; canEdit: boolean; grantedBy: string; at: number };

export async function listOperators(services: Services): Promise<OperatorGrant[]> {
  const rows = await services.store.query("ADMIN#OPERATORS", "EMAIL#", { limit: 200 });
  return rows
    .filter(row => (GRANTABLE_ROLES as readonly string[]).includes(String(row.role)))
    .map(row => ({ email: String(row.email), role: row.role as GrantableRole, canEdit: row.role === "admin" && row.canEdit === true,
      grantedBy: String(row.grantedBy), at: Number(row.at) }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

/** Super admins only (checked by the caller). Upserts the operator role for a verified email. */
export async function grantOperator(services: Services, actorId: string, input: Record<string, unknown>) {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254 ||
    !(GRANTABLE_ROLES as readonly string[]).includes(String(input.role))) throw new ServiceError("admin_invalid_operator", 400);
  const role = input.role as GrantableRole;
  // Edit access is only meaningful for admins; the other roles have fixed rights.
  const canEdit = role === "admin" && input.canEdit === true;
  const now = Date.now();
  const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  await services.store.transact([
    { kind: "put", item: { ...operatorKey(email), email, role, canEdit, grantedBy: actorId, at: now } },
    auditWrite(id, now, { action: "grant_operator", actorId, targetId: email, reason: `Operator role set to ${role}${role === "admin" ? (canEdit ? " with edit access" : " (view only)") : ""}` }),
  ]);
  return { email, role, canEdit, grantedBy: actorId, at: now } satisfies OperatorGrant;
}

export async function revokeOperator(services: Services, actorId: string, emailInput: unknown) {
  const email = typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email)) throw new ServiceError("admin_invalid_operator", 400);
  if (!await services.store.get(operatorKey(email))) throw new ServiceError("admin_operator_not_found", 404);
  const now = Date.now();
  await services.store.transact([
    { kind: "delete", key: operatorKey(email) },
    auditWrite(`${now}-${Math.random().toString(36).slice(2, 8)}`, now,
      { action: "revoke_operator", actorId, targetId: email, reason: "Operator access removed" }),
  ]);
}

function auditWrite(id: string, now: number, entry: { action: string; actorId: string; targetId: string; reason: string }) {
  const key = auditKey(id);
  return { kind: "put" as const, item: { ...key, gsi2pk: "ADMIN#AUDIT",
    gsi2sk: `${String(Number.MAX_SAFE_INTEGER - now).padStart(16, "0")}#${id}`, ...entry, at: now, result: "applied" } };
}

export const USAGE_WINDOWS = [7, 30, 90] as const;

/**
 * Workspace activity from the ledger's per-member daily rows. `requests` and `credits`
 * are recorded from the day tracking began; earlier days show tokens only.
 */
export async function adminUsage(services: Services, days: number = 30, now = Date.now()) {
  if (!(USAGE_WINDOWS as readonly number[]).includes(days)) throw new ServiceError("admin_invalid_usage_window", 400);
  const dates = Array.from({ length: days }, (_, i) => new Date(now - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10));
  const first = dates[0]!;
  const workspaceKeys = await services.store.queryIndex("gsi2", "ADMIN#WORKSPACES", { limit: 500 });
  const rows = await mapBatches(workspaceKeys, async key => {
    const workspace = await services.directory.getWorkspace(String(key.pk).slice(3));
    if (!workspace || isLocalDevFixtureUserId(workspace.ownerId)) return [];
    const activity = await services.store.query(`WS#${workspace.id}`, "ACT#");
    return activity.map(row => {
      const [, member, date] = String(row.sk).split("#");
      return { member: member!, date: date!, plan: workspace.plan, tokens: Number(row.tokens ?? 0),
        requests: Number(row.requests ?? 0), credits: Number(row.credits ?? 0) / 1000 };
    });
  });
  const perDay = new Map(dates.map(date => [date, { date, tokens: 0, requests: 0, credits: 0, members: new Set<string>() }]));
  const perUser = new Map<string, { id: string; tokens: number; requests: number; credits: number }>();
  const perPlan: Record<string, { tokens: number; requests: number; credits: number }> =
    { free: { tokens: 0, requests: 0, credits: 0 }, pro: { tokens: 0, requests: 0, credits: 0 }, team: { tokens: 0, requests: 0, credits: 0 } };
  for (const row of rows.flat()) {
    const day = row.date >= first ? perDay.get(row.date) : undefined;
    if (!day) continue;
    day.tokens += row.tokens; day.requests += row.requests; day.credits += row.credits; day.members.add(row.member);
    const user = perUser.get(row.member) ?? { id: row.member, tokens: 0, requests: 0, credits: 0 };
    user.tokens += row.tokens; user.requests += row.requests; user.credits += row.credits; perUser.set(row.member, user);
    const plan = perPlan[row.plan];
    if (plan) { plan.tokens += row.tokens; plan.requests += row.requests; plan.credits += row.credits; }
  }
  const topUsers = await Promise.all([...perUser.values()].sort((a, b) => b.tokens - a.tokens).slice(0, 8).map(async user => {
    const record = await services.directory.getUser(user.id);
    return { ...user, email: record?.email ?? "Unknown user", name: record?.name ?? "" };
  }));
  const series = [...perDay.values()].map(({ members, ...day }) => ({ ...day, activeUsers: members.size }));
  return {
    days, series, topUsers, byPlan: perPlan,
    totals: { tokens: series.reduce((n, d) => n + d.tokens, 0), requests: series.reduce((n, d) => n + d.requests, 0),
      credits: series.reduce((n, d) => n + d.credits, 0), activeUsers: perUser.size },
    limited: workspaceKeys.length === 500,
  };
}

export type ModelState = "not_configured" | "idle" | "active" | "fallback" | "failing";

function novaStatus(env: Record<string, string | undefined>) {
  const modelId = env.ARIA_NOVA_MODEL_ID?.trim() || undefined;
  const configured = Boolean(modelId && env.ARIA_RATE_VERSION?.trim()
    && Number(env.ARIA_NOVA_INPUT_USD_PER_MILLION) > 0 && Number(env.ARIA_NOVA_OUTPUT_USD_PER_MILLION) > 0);
  return { modelId, configured };
}

/** What the server is set up to use, read from its own configuration (never exposes keys). */
export function modelConfigStatus(config: ServerConfig, env: Record<string, string | undefined> = process.env) {
  const nova = novaStatus(env);
  const claude = claudeConfigured(env);
  const primary: { provider: ModelProvider; modelId: string } | null = claude
    ? { provider: "claude", modelId: env.ANTHROPIC_MODEL_ID?.trim() || DEFAULT_CLAUDE_MODEL }
    : config.localIdentity ? { provider: "local", modelId: "aria/local-test-nova" }
      : nova.configured ? { provider: "bedrock", modelId: nova.modelId! } : null;
  return {
    primary,
    fallback: { configured: claude && !config.localIdentity && nova.configured, modelId: nova.modelId },
    webSearch: { enabled: claude && (config.claudeWebSearchMaxUses ?? 0) > 0, maxUses: config.claudeWebSearchMaxUses ?? 0 },
    liveChat: config.liveChat || config.localIdentity,
    environment: config.environment,
  };
}

/** Which model is answering chat: configuration plus what actually served the most recent requests. */
export async function adminModels(services: Services, now = Date.now(), env: Record<string, string | undefined> = process.env) {
  const config = modelConfigStatus(services.config, env);
  const usage = await readModelUsage(services.store, 7, now);
  const { last } = usage;
  const state: ModelState = !config.primary ? "not_configured"
    : !last ? "idle"
      : !last.ok ? "failing"
        : last.fallback ? "fallback" : "active";
  const serving = last?.ok ? { provider: last.provider, modelId: last.modelId } : config.primary;
  return { config, usage, state, serving };
}

/** Super admins are configured on the server, so this only reports the ones the server can name. */
export async function listSuperAdmins(services: Services, current?: { email: string; name: string }) {
  const found = new Map<string, { email: string; name: string }>();
  if (current) found.set(current.email.toLowerCase(), { email: current.email, name: current.name });
  for (const subject of services.config.adminSubjects ?? []) {
    const user = await services.directory.getUser(subject).catch(() => undefined);
    if (user) found.set(user.email.toLowerCase(), { email: user.email, name: user.name });
  }
  if (services.config.environment === "development" && services.config.adminLocalDev) {
    for (const email of services.config.adminEmails ?? []) if (!found.has(email)) found.set(email, { email, name: "" });
  }
  return [...found.values()];
}
