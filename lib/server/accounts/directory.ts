import { createHash, randomBytes, randomUUID } from "node:crypto";
import { ServiceError } from "../errors";
import { ConditionFailed, notExists, type Item, type Key, type Store, type Write } from "../store/types";
import type { CreditLedger } from "../accounting/credit-ledger";
import { entitlementFor, isPlanId, isRole, periodFor, requirePermission, PLANS, type PlanId, type Role } from "./entitlements";
import { monthlyUnitsForPlan, seatLimitForPlan } from "../subscription-catalog";

/** Claims taken from a verified identity token. Never from request bodies. */
export type Identity = { sub: string; email: string; emailVerified: boolean; name: string; authTime: number };
export type UserRecord = {
  id: string; email: string; name: string; status: "active" | "disabled";
  /** When true, the customer can sign in but cannot use ARIA AI until access is restored. */
  aiAccessSuspended: boolean;
  personalWorkspaceId: string; defaultWorkspaceId: string; sessionsRevokedAfter: number;
};
export type WorkspaceRecord = {
  id: string;
  name: string;
  plan: PlanId;
  seatLimit: number;
  seatsUsed: number;
  ownerId: string;
  createdAt?: number;
};
export type Membership = { workspaceId: string; userId: string; role: Role; email: string; name: string };
export type MemberView = { id: string; name: string; email: string; role: Role; status: "active" | "pending" | "expired"; expiresAt?: number };

export const INVITE_TTL_MS = 7 * 24 * 3_600_000;

const k = {
  user: (sub: string): Key => ({ pk: `USER#${sub}`, sk: "PROFILE" }),
  avatar: (sub: string): Key => ({ pk: `USER#${sub}`, sk: "AVATAR" }),
  workspace: (w: string): Key => ({ pk: `WS#${w}`, sk: "META" }),
  member: (w: string, sub: string): Key => ({ pk: `WS#${w}`, sk: `MEMBER#${sub}` }),
  email: (w: string, email: string): Key => ({ pk: `WS#${w}`, sk: `EMAIL#${email}` }),
  invite: (w: string, id: string): Key => ({ pk: `WS#${w}`, sk: `INVITE#${id}` }),
  inviteToken: (hash: string): Key => ({ pk: `INVITETOKEN#${hash}`, sk: "INVITE" }),
  entitlementEvent: (w: string, id: string): Key => ({ pk: `WS#${w}`, sk: `ENTEVT#${id}` }),
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const activeMember = (role: Role) => [{ field: "status", op: "=" as const, value: "active" }, { field: "role", op: "=" as const, value: role }];

export class AccountDirectory {
  constructor(private store: Store, private clock: () => number = Date.now, private newId: () => string = randomUUID) {}

  /** Creates the user and a personal Free workspace on first sign-in. Safe under concurrency. */
  async ensureAccount(identity: Identity): Promise<UserRecord> {
    const existing = await this.getUser(identity.sub);
    if (existing) return existing;
    const workspaceId = this.newId();
    const now = this.clock();
    const email = normalizeEmail(identity.email);
    const name = identity.name || email.split("@")[0] || "ARIA user";
    try {
      await this.store.transact([
        { kind: "put", when: [notExists], item: { ...k.user(identity.sub), email, name, status: "active", aiAccessSuspended: false,
          personalWorkspaceId: workspaceId, defaultWorkspaceId: workspaceId, sessionsRevokedAfter: 0, createdAt: now,
          gsi2pk: "ADMIN#USERS", gsi2sk: `${String(now).padStart(13, "0")}#${identity.sub}` } },
        { kind: "put", when: [notExists], item: { ...k.workspace(workspaceId), workspaceId, name: `${name}'s workspace`,
          plan: "free", seatLimit: PLANS.free.seats, seatsUsed: 1, ownerId: identity.sub, createdAt: now,
          gsi2pk: "ADMIN#WORKSPACES", gsi2sk: `${String(now).padStart(13, "0")}#${workspaceId}` } },
        { kind: "put", when: [notExists], item: { ...this.memberItem(workspaceId, identity.sub, "owner", email, name, now) } },
        { kind: "put", when: [notExists], item: { ...k.email(workspaceId, email), userId: identity.sub } },
      ]);
    } catch (error) { if (!(error instanceof ConditionFailed)) throw error; }
    const user = await this.getUser(identity.sub);
    if (!user) throw new ServiceError("account_unavailable", 503);
    return user;
  }

  async getUser(sub: string): Promise<UserRecord | undefined> {
    const row = await this.store.get(k.user(sub));
    if (!row) return undefined;
    const signInBlocked = row.signInBlocked === true;
    const legacyAiOff = !signInBlocked && row.status !== "active";
    const status: UserRecord["status"] = signInBlocked ? "disabled" : "active";
    const aiAccessSuspended = row.aiAccessSuspended === true || legacyAiOff;
    return { id: sub, email: String(row.email), name: String(row.name), status,
      aiAccessSuspended,
      personalWorkspaceId: String(row.personalWorkspaceId), defaultWorkspaceId: String(row.defaultWorkspaceId),
      sessionsRevokedAfter: Number(row.sessionsRevokedAfter ?? 0) };
  }

  /** Rejects disabled accounts and tokens from sessions that were signed out. */
  assertSessionValid(user: UserRecord, identity: Identity) {
    if (user.status !== "active") throw new ServiceError("account_disabled", 403);
    if (identity.authTime <= user.sessionsRevokedAfter) throw new ServiceError("session_revoked", 401);
  }

  assertAiAccess(user: UserRecord) {
    if (user.aiAccessSuspended) throw new ServiceError("ai_access_suspended", 403);
  }

  /** Invalidates every token whose sign-in happened at or before `atSeconds`. */
  async revokeSessions(sub: string, atSeconds = Math.floor(this.clock() / 1000)) {
    await this.store.transact([{ kind: "update", key: k.user(sub), set: { sessionsRevokedAfter: atSeconds }, when: [{ field: "pk", op: "exists" }] }]);
  }

  async setUserStatus(sub: string, status: "active" | "disabled") {
    await this.store.transact([{ kind: "update", key: k.user(sub),
      set: { status, signInBlocked: status === "disabled" }, when: [{ field: "pk", op: "exists" }] }]);
  }

  async updateProfile(sub: string, patch: { name?: string; avatar?: string | null }) {
    const writes: Write[] = [patch.name === undefined
      ? { kind: "check", key: k.user(sub), when: [{ field: "status", op: "=", value: "active" }] }
      : { kind: "update", key: k.user(sub), set: { name: patch.name }, when: [{ field: "status", op: "=", value: "active" }] }];
    if (patch.avatar) writes.push({ kind: "put", item: { ...k.avatar(sub), data: patch.avatar } });
    else if (patch.avatar === null) writes.push({ kind: "delete", key: k.avatar(sub) });
    try {
      await this.store.transact(writes);
    } catch (error) {
      if (error instanceof ConditionFailed) throw new ServiceError("account_disabled", 403);
      throw error;
    }
    const user = await this.getUser(sub);
    if (!user) throw new ServiceError("account_unavailable", 503);
    return user;
  }

  /** Photos are fetched only for session/profile views, not every authenticated request. */
  async getAvatar(sub: string): Promise<string | null> {
    const row = await this.store.get(k.avatar(sub));
    return typeof row?.data === "string" ? row.data : null;
  }

  async getWorkspace(workspaceId: string): Promise<WorkspaceRecord | undefined> {
    const row = await this.store.get(k.workspace(workspaceId));
    if (!row) return undefined;
    if (!isPlanId(row.plan)) throw new ServiceError("workspace_plan_invalid", 500);
    return {
      id: workspaceId,
      name: String(row.name),
      plan: row.plan,
      seatLimit: Number(row.seatLimit),
      seatsUsed: Number(row.seatsUsed),
      ownerId: String(row.ownerId),
      ...(typeof row.createdAt === "number" && Number.isFinite(row.createdAt)
        ? { createdAt: Number(row.createdAt) }
        : {}),
    };
  }

  async getMembership(workspaceId: string, userId: string): Promise<Membership | undefined> {
    const row = await this.store.get(k.member(workspaceId, userId));
    if (!row || row.status !== "active" || !isRole(row.role)) return undefined;
    return { workspaceId, userId, role: row.role, email: String(row.email), name: String(row.name) };
  }

  /**
   * Resolves the workspace a request acts on. An explicitly requested workspace
   * must have an active membership; a stale default falls back to the personal one.
   */
  async resolveWorkspace(user: UserRecord, requested?: string | null) {
    const target = requested || user.defaultWorkspaceId || user.personalWorkspaceId;
    let membership = await this.getMembership(target, user.id);
    if (!membership) {
      if (requested) {
        const prior = await this.store.get(k.member(requested, user.id));
        throw prior ? new ServiceError("access_revoked", 403) : new ServiceError("workspace_not_found", 404);
      }
      membership = await this.getMembership(user.personalWorkspaceId, user.id);
      if (!membership) throw new ServiceError("workspace_not_found", 404);
    }
    const workspace = await this.getWorkspace(membership.workspaceId);
    if (!workspace) throw new ServiceError("workspace_not_found", 404);
    return { workspace, membership };
  }

  async listWorkspaces(userId: string) {
    const rows = await this.store.queryIndex("gsi1", `USER#${userId}`);
    const out: (WorkspaceRecord & { role: Role })[] = [];
    for (const row of rows) {
      const workspaceId = String(row.workspaceId);
      const membership = await this.getMembership(workspaceId, userId);
      const workspace = membership && await this.getWorkspace(workspaceId);
      if (membership && workspace) out.push({ ...workspace, role: membership.role });
    }
    return out;
  }

  async selectWorkspace(user: UserRecord, workspaceId: string) {
    const { workspace } = await this.resolveWorkspace(user, workspaceId);
    await this.store.transact([{ kind: "update", key: k.user(user.id), set: { defaultWorkspaceId: workspace.id } }]);
    return workspace;
  }

  async members(workspaceId: string): Promise<MemberView[]> {
    const now = this.clock();
    const active = (await this.store.query(`WS#${workspaceId}`, "MEMBER#"))
      .filter(r => r.status === "active" && isRole(r.role));
    const members = await Promise.all(active.map(async r => {
      const profile = await this.getUser(String(r.userId));
      return { id: String(r.userId), name: profile?.name ?? String(r.name), email: String(r.email),
        role: r.role as Role, status: "active" as const };
    }));
    const invites = (await this.store.query(`WS#${workspaceId}`, "INVITE#"))
      .filter(r => r.status === "pending" && isRole(r.role))
      .map(r => ({ id: `invite_${String(r.inviteId)}`, name: String(r.email).split("@")[0], email: String(r.email),
        role: r.role as Role, status: Number(r.expiresAt) > now ? "pending" as const : "expired" as const, expiresAt: Number(r.expiresAt) }));
    return [...members, ...invites];
  }

  /** Returns the plaintext token once; only its hash is stored. */
  async invite(actor: Membership, rawEmail: string, role: Role = "member") {
    requirePermission(actor.role, "members:invite");
    if (role === "owner" || (role === "admin" && actor.role !== "owner")) throw new ServiceError("permission_denied", 403);
    const email = normalizeEmail(rawEmail);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new ServiceError("invalid_email", 400);
    const workspace = await this.getWorkspace(actor.workspaceId);
    if (!workspace) throw new ServiceError("workspace_not_found", 404);
    if (!entitlementFor(workspace.plan).teamManagement) throw new ServiceError("plan_required", 403);
    const inviteId = this.newId();
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const now = this.clock();
    const expiresAt = now + INVITE_TTL_MS;
    try {
      await this.store.transact([
        { kind: "update", key: k.workspace(workspace.id), add: { seatsUsed: 1 },
          when: [{ field: "seatsUsed", op: "<", value: workspace.seatLimit }, { field: "seatLimit", op: "=", value: workspace.seatLimit }] },
        { kind: "put", when: [notExists], item: { ...k.email(workspace.id, email), inviteId } },
        { kind: "check", key: k.member(workspace.id, actor.userId), when: activeMember(actor.role) },
        { kind: "put", when: [notExists], item: { ...k.invite(workspace.id, inviteId), inviteId, email, role,
          tokenHash, status: "pending", invitedBy: actor.userId, createdAt: now, expiresAt } },
        { kind: "put", when: [notExists], item: { ...k.inviteToken(tokenHash), workspaceId: workspace.id, inviteId, ttl: Math.ceil(expiresAt / 1000) + 86_400 } },
      ]);
    } catch (error) {
      if (!(error instanceof ConditionFailed)) throw error;
      const failed = new Set(error.failedIndexes);
      if (failed.has(2)) throw new ServiceError("access_revoked", 403);
      if (failed.has(1)) throw new ServiceError("already_invited_or_member", 409);
      if (failed.has(0)) throw new ServiceError("seats_exhausted", 409);
      throw error;
    }
    return { inviteId, token, expiresAt, workspaceId: workspace.id };
  }

  async acceptInvite(identity: Identity, user: UserRecord, token: string) {
    if (typeof token !== "string" || token.length < 20 || token.length > 200) throw new ServiceError("invite_not_found", 404);
    const tokenHash = hashToken(token);
    const pointer = await this.store.get(k.inviteToken(tokenHash));
    if (!pointer) throw new ServiceError("invite_not_found", 404);
    const workspaceId = String(pointer.workspaceId);
    const invite = await this.store.get(k.invite(workspaceId, String(pointer.inviteId)));
    const now = this.clock();
    if (!invite || invite.status !== "pending" || invite.tokenHash !== tokenHash) throw new ServiceError("invite_not_found", 404);
    if (Number(invite.expiresAt) <= now) throw new ServiceError("invite_expired", 410);
    const email = normalizeEmail(identity.email);
    if (!identity.emailVerified || email !== invite.email) throw new ServiceError("invite_email_mismatch", 403);
    const role = isRole(invite.role) ? invite.role : "member";
    try {
      await this.store.transact([
        { kind: "update", key: k.invite(workspaceId, String(invite.inviteId)), set: { status: "accepted", acceptedBy: user.id, acceptedAt: now },
          when: [{ field: "status", op: "=", value: "pending" }, { field: "expiresAt", op: ">", value: now }] },
        { kind: "put", when: [{ any: [{ field: "pk", op: "notExists" }, { field: "status", op: "=", value: "revoked" }] }],
          item: this.memberItem(workspaceId, user.id, role, email, user.name, now) },
        { kind: "delete", key: k.inviteToken(tokenHash) },
        { kind: "update", key: k.email(workspaceId, email), set: { userId: user.id }, remove: ["inviteId"] },
      ]);
    } catch (error) {
      if (!(error instanceof ConditionFailed)) throw error;
      if (error.failedIndexes.includes(1)) throw new ServiceError("already_member", 409);
      throw new ServiceError("invite_not_found", 404);
    }
    await this.store.transact([{ kind: "update", key: k.user(user.id), set: { defaultWorkspaceId: workspaceId } }]);
    return workspaceId;
  }

  /** Revokes membership immediately; in-flight reservations are refused at the ledger. */
  async removeMember(actor: Membership, targetUserId: string) {
    requirePermission(actor.role, "members:remove");
    if (targetUserId === actor.userId) throw new ServiceError("cannot_remove_self", 400);
    const target = await this.getMembership(actor.workspaceId, targetUserId);
    if (!target) throw new ServiceError("member_not_found", 404);
    if (target.role === "owner") throw new ServiceError("cannot_remove_owner", 403);
    if (target.role === "admin" && actor.role !== "owner") throw new ServiceError("permission_denied", 403);
    const now = this.clock();
    try {
      await this.store.transact([
        { kind: "update", key: k.member(actor.workspaceId, targetUserId), when: [{ field: "status", op: "=", value: "active" }],
          set: { status: "revoked", revokedAt: now, revokedBy: actor.userId }, remove: ["gsi1pk", "gsi1sk"] },
        { kind: "update", key: k.workspace(actor.workspaceId), add: { seatsUsed: -1 } },
        { kind: "delete", key: k.email(actor.workspaceId, target.email) },
        { kind: "check", key: k.member(actor.workspaceId, actor.userId), when: activeMember(actor.role) },
      ]);
    } catch (error) {
      if (!(error instanceof ConditionFailed)) throw error;
      if (error.failedIndexes.includes(3)) throw new ServiceError("access_revoked", 403);
      throw new ServiceError("member_not_found", 404);
    }
  }

  async revokeInvite(actor: Membership, inviteId: string) {
    requirePermission(actor.role, "members:invite");
    const invite = await this.store.get(k.invite(actor.workspaceId, inviteId));
    if (!invite || invite.status !== "pending") throw new ServiceError("invite_not_found", 404);
    try {
      await this.store.transact([
        { kind: "update", key: k.invite(actor.workspaceId, inviteId), set: { status: "revoked", revokedBy: actor.userId },
          when: [{ field: "status", op: "=", value: "pending" }] },
        { kind: "delete", key: k.inviteToken(String(invite.tokenHash)) },
        { kind: "update", key: k.workspace(actor.workspaceId), add: { seatsUsed: -1 } },
        { kind: "delete", key: k.email(actor.workspaceId, String(invite.email)) },
        { kind: "check", key: k.member(actor.workspaceId, actor.userId), when: activeMember(actor.role) },
      ]);
    } catch (error) {
      if (!(error instanceof ConditionFailed)) throw error;
      if (error.failedIndexes.includes(4)) throw new ServiceError("access_revoked", 403);
      throw new ServiceError("invite_not_found", 404);
    }
  }

  /**
   * Applies a plan change from a verified billing event. Duplicate and
   * out-of-order events are ignored. Upgrades top up the current period by the
   * allowance difference in the same transaction; downgrades apply next period.
   */
  async applyEntitlement(ledger: CreditLedger, workspaceId: string, change: { plan: PlanId; eventId: string; occurredAt: number }) {
    if (!isPlanId(change.plan) || !/^[\w:.-]{1,128}$/.test(change.eventId) || !Number.isSafeInteger(change.occurredAt)) {
      throw new ServiceError("invalid_entitlement_event", 400);
    }
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) throw new ServiceError("workspace_not_found", 404);
    if (await this.store.get(k.entitlementEvent(workspaceId, change.eventId))) return "duplicate" as const;
    const period = await ledger.ensurePeriodGrant(workspaceId, workspace.plan);
    const [newUnits, oldUnits, seatLimit] = await Promise.all([
      monthlyUnitsForPlan(this.store, change.plan),
      monthlyUnitsForPlan(this.store, workspace.plan),
      seatLimitForPlan(this.store, change.plan),
    ]);
    const delta = newUnits - oldUnits;
    const writes: Write[] = [
      { kind: "put", when: [notExists], item: { ...k.entitlementEvent(workspaceId, change.eventId),
        plan: change.plan, previousPlan: workspace.plan, occurredAt: change.occurredAt, appliedAt: this.clock() } },
      { kind: "update", key: k.workspace(workspaceId), set: { plan: change.plan, seatLimit, entitlementAt: change.occurredAt },
        when: [{ field: "plan", op: "=", value: workspace.plan },
          { any: [{ field: "entitlementAt", op: "notExists" }, { field: "entitlementAt", op: "<", value: change.occurredAt }] }] },
      ...(delta > 0 && period === periodFor(this.clock()) ? ledger.grantWrites(workspaceId, period, delta, `plan:${change.eventId}`) : []),
    ];
    try {
      await this.store.transact(writes);
      return "applied" as const;
    } catch (error) {
      if (!(error instanceof ConditionFailed)) throw error;
      if (error.failedIndexes.includes(0)) return "duplicate" as const;
      const current = await this.store.get(k.workspace(workspaceId));
      if (current && Number(current.entitlementAt ?? -1) >= change.occurredAt) {
        await this.store.transact([{ kind: "put", when: [notExists], item: { ...k.entitlementEvent(workspaceId, change.eventId),
          plan: change.plan, ignored: "stale", occurredAt: change.occurredAt, appliedAt: this.clock() } }]).catch(() => undefined);
        return "stale" as const;
      }
      throw new ServiceError("entitlement_conflict", 409);
    }
  }

  private memberItem(workspaceId: string, sub: string, role: Role, email: string, name: string, now: number): Item {
    return { ...k.member(workspaceId, sub), workspaceId, userId: sub, role, status: "active", email, name,
      joinedAt: now, gsi1pk: `USER#${sub}`, gsi1sk: `WS#${workspaceId}` };
  }
}
