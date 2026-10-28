import { ServiceError } from "./errors";
import { authenticate } from "./request-context";
import { isPlanId, type PlanId } from "./accounts/entitlements";
import { seatLimitForPlan } from "./subscription-catalog";
import { ConditionFailed, notExists } from "./store/types";
import type { Services } from "./services";
import { internalAuditReasonForSource, INTERNAL_AUDIT_SOURCE_AI_ACCESS } from "@/lib/internal-audit-copy";
import { isLocalDevFixtureUserId } from "@/lib/local-user-shared";

const auditKey = (id: string) => ({ pk: "ADMIN#AUDIT", sk: `ACTION#${id}` });
const validId = (value: unknown) => typeof value === "string" && /^[\w:.-]{1,128}$/.test(value);
export type InternalRole = "super_admin" | "support" | "billing" | "operations";

async function mapBatches<T, R>(items: T[], task: (item: T) => Promise<R>, size = 20): Promise<R[]> {
  const output: R[] = [];
  for (let at = 0; at < items.length; at += size) output.push(...await Promise.all(items.slice(at, at + size).map(task)));
  return output;
}

function subjectRole(services: Services, subject: string): InternalRole | undefined {
  if (services.config.adminSubjects?.includes(subject)) return "super_admin";
  return services.config.adminRoles?.[subject];
}

/**
 * Internal operator access is bound to verified Cognito subjects, never a workspace role.
 * In local preview only, a Cognito sign-in is granted when its verified email already belongs
 * to an allowlisted operator (so demo operators keep access after signing in with Cognito).
 */
export async function requireInternalAdmin(request: Request, services: Services) {
  const auth = await authenticate(request, services);
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
  if (!role) {
    throw new ServiceError("admin_access_denied", 403);
  }
  return { ...auth, internalRole: role };
}

export function assertAdminActionAllowed(role: InternalRole, type: AdminAction["type"]) {
  if (role === "super_admin") return;
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
