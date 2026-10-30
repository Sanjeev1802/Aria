import { ServiceError } from "../errors";
import { entitlementFor, periodFor, type PlanId } from "../accounts/entitlements";
import { monthlyUnitsForPlan } from "../subscription-catalog";
import { ConditionFailed, notExists, type Item, type Key, type Store, type Write } from "../store/types";
import { recordModelUse, type ModelUseEntry } from "../model-usage";

export type Account = { workspaceId: string; memberId: string; plan: PlanId };
export type ReservationRequest = { id: string; hash: string; units: number; model: string; rateVersion: string };
export type Settlement = { charged: number; inputTokens: number; outputTokens: number; response: string };
export type RequestRecord = {
  id: string; workspaceId: string; memberId: string; hash: string;
  status: "reserved" | "completed" | "failed"; providerState: "pending" | "started";
  reserved: number; charged: number; inputTokens: number; outputTokens: number;
  response?: string; model: string; rateVersion: string; period: string; createdAt: number;
  failureReason?: string; reconciliation?: string;
};

export const MAX_ACTIVE_PER_MEMBER = 1;
/** Free-tier burst limit; tests and docs reference the strictest plan. */
export const REQUESTS_PER_MINUTE = entitlementFor("free").requestsPerMinute;
/** Longer than the 90 s provider deadline, so a live request never loses its lock. */
export const ACTIVE_LOCK_MS = 120_000;
/** Reservations older than this are presumed crashed and reconciled. */
export const STALE_RESERVATION_MS = 10 * 60_000;

const ws = (id: string) => `WS#${id}`;
export const keys = {
  period: (w: string, period: string): Key => ({ pk: ws(w), sk: `PERIOD#${period}` }),
  request: (w: string, id: string): Key => ({ pk: ws(w), sk: `REQ#${id}` }),
  event: (w: string, ref: string, kind: string): Key => ({ pk: ws(w), sk: `EVT#${ref}#${kind}` }),
  active: (w: string, member: string): Key => ({ pk: ws(w), sk: `ACTIVE#${member}` }),
  rate: (w: string, member: string, minute: number): Key => ({ pk: ws(w), sk: `RATE#${member}#${minute}` }),
  activity: (w: string, member: string, day: string): Key => ({ pk: ws(w), sk: `ACT#${member}#${day}` }),
  dailyMessages: (w: string, member: string, day: string): Key => ({ pk: ws(w), sk: `DAYMSG#${member}#${day}` }),
  memberBudget: (w: string, member: string, period: string): Key => ({ pk: ws(w), sk: `BUDGET#${period}#${member}` }),
  member: (w: string, member: string): Key => ({ pk: ws(w), sk: `MEMBER#${member}` }),
  workspace: (w: string): Key => ({ pk: ws(w), sk: "META" }),
};

const credits = (units: number) => units / 1000;
const ttlAfter = (now: number, ms: number) => Math.ceil((now + ms) / 1000);

/**
 * Shared workspace credit ledger. Every balance change is a single conditional
 * transaction, so independent app instances cannot overspend or double-settle.
 */
export class CreditLedger {
  constructor(private store: Store, private clock: () => number = Date.now) {}

  /** Idempotently opens the current monthly period with the plan's allowance. */
  async ensurePeriodGrant(workspaceId: string, plan: PlanId) {
    const now = this.clock();
    const period = periodFor(now);
    if (await this.store.get(keys.period(workspaceId, period))) return period;
    const units = await monthlyUnitsForPlan(this.store, plan);
    try {
      await this.store.transact([
        { kind: "put", when: [notExists], item: { ...keys.period(workspaceId, period),
          granted: units, used: 0, reserved: 0, available: units, plan, createdAt: now } },
        this.eventWrite(workspaceId, `GRANT#period:${period}`, "grant", units, { period, createdAt: now }),
      ]);
    } catch (error) { if (!(error instanceof ConditionFailed)) throw error; }
    return period;
  }

  /** Writes that add credits to an existing period exactly once per grant ID. */
  grantWrites(workspaceId: string, period: string, units: number, grantId: string): Write[] {
    if (!Number.isSafeInteger(units) || units <= 0) throw new Error("Invalid grant");
    return [
      { kind: "update", key: keys.period(workspaceId, period), add: { granted: units, available: units }, when: [{ field: "pk", op: "exists" }] },
      this.eventWrite(workspaceId, `GRANT#${grantId}`, "grant", units, { period, createdAt: this.clock() }),
    ];
  }

  async balance(workspaceId: string) {
    const period = periodFor(this.clock());
    const row = await this.store.get(keys.period(workspaceId, period));
    const n = (f: string) => Number(row?.[f] ?? 0);
    return { period, included: credits(n("granted")), used: credits(n("used")),
      reserved: credits(n("reserved")), available: credits(n("available")) };
  }

  /** Member meters renew with the UTC billing month. An absent limit means the shared pool applies. */
  async memberBudget(workspaceId: string, memberId: string, period = periodFor(this.clock())) {
    const row = await this.store.get(keys.memberBudget(workspaceId, memberId, period));
    const policy = row ? undefined : await this.store.get(keys.member(workspaceId, memberId));
    const limit = row?.limit ?? policy?.creditLimit;
    return { period, limit: typeof limit === "number" ? limit / 1000 : null,
      used: Number(row?.used ?? 0) / 1000, reserved: Number(row?.reserved ?? 0) / 1000 };
  }

  private async ensureMemberBudget(workspaceId: string, memberId: string, period: string) {
    const key = keys.memberBudget(workspaceId, memberId, period);
    const existing = await this.store.get(key);
    if (existing) return existing;
    const member = await this.store.get(keys.member(workspaceId, memberId));
    try {
      await this.store.transact([{ kind: "put", when: [notExists], item: { ...key, used: 0, reserved: 0, exposure: 0,
        ...(typeof member?.creditLimit === "number" ? { limit: member.creditLimit } : {}) } }]);
    } catch (error) { if (!(error instanceof ConditionFailed)) throw error; }
    return this.store.get(key);
  }

  async setMemberLimit(workspaceId: string, actorId: string, actorRole: string, memberId: string,
    memberRole: string, limitUnits: number | null) {
    const period = periodFor(this.clock());
    await this.ensureMemberBudget(workspaceId, memberId, period);
    const checks: Write[] = [
      ...(actorId === memberId ? [] : [{ kind: "check" as const, key: keys.member(workspaceId, actorId), when: [
        { field: "status" as const, op: "=" as const, value: "active" },
        { field: "role" as const, op: "=" as const, value: actorRole }] }]),
      { kind: "update", key: keys.member(workspaceId, memberId),
        ...(limitUnits === null ? { remove: ["creditLimit"] } : { set: { creditLimit: limitUnits } }),
        when: [{ field: "status", op: "=", value: "active" }, { field: "role", op: "=", value: memberRole }] },
      { kind: "check", key: keys.workspace(workspaceId), when: [{ field: "plan", op: "=", value: "team" }] },
    ];
    try {
      await this.store.transact([
        ...checks,
        { kind: "update", key: keys.memberBudget(workspaceId, memberId, period),
          ...(limitUnits === null ? { remove: ["limit"] } : { set: { limit: limitUnits } }),
          when: [{ field: "pk", op: "exists" }] },
      ]);
    } catch (error) {
      if (error instanceof ConditionFailed) throw new ServiceError("member_limit_conflict", 409);
      throw error;
    }
    return this.memberBudget(workspaceId, memberId, period);
  }

  async find(workspaceId: string, id: string, hash?: string): Promise<RequestRecord | undefined> {
    const row = await this.store.get(keys.request(workspaceId, id));
    if (row && hash !== undefined && row.hash !== hash) throw new ServiceError("idempotency_conflict", 409);
    return row ? toRecord(row) : undefined;
  }

  /**
   * Holds `units` from the workspace pool. Returns the existing record for a
   * duplicate request ID with identical content, or undefined for a new hold.
   */
  async reserve(account: Account, request: ReservationRequest): Promise<RequestRecord | undefined> {
    if (!Number.isSafeInteger(request.units) || request.units <= 0) throw new Error("Invalid reservation");
    const existing = await this.find(account.workspaceId, request.id, request.hash);
    if (existing) return existing;
    const now = this.clock();
    const period = periodFor(now);
    const { workspaceId: w, memberId: m } = account;
    const metered = account.plan === "team";
    const planLimits = entitlementFor(account.plan);
    const budget = metered ? await this.ensureMemberBudget(w, m, period) : undefined;
    const limit = typeof budget?.limit === "number" ? budget.limit : null;
    const day = new Date(now).toISOString().slice(0, 10);
    const writes: Write[] = [
      { kind: "put", when: [notExists], item: { ...keys.request(w, request.id),
        workspaceId: w, memberId: m, requestId: request.id, hash: request.hash,
        status: "reserved", providerState: "pending", reserved: request.units, charged: 0,
        inputTokens: 0, outputTokens: 0, model: request.model, rateVersion: request.rateVersion,
        period, memberMetered: metered, createdAt: now, gsi2pk: "RESERVED", gsi2sk: `${String(now).padStart(15, "0")}#${w}#${request.id}` } },
      { kind: "update", key: keys.period(w, period), add: { reserved: request.units, available: -request.units },
        when: [{ field: "available", op: ">=", value: request.units }] },
      { kind: "put", when: [{ any: [{ field: "pk", op: "notExists" }, { field: "expiresAt", op: "<", value: now }] }],
        item: { ...keys.active(w, m), requestId: request.id, expiresAt: now + ACTIVE_LOCK_MS, ttl: ttlAfter(now, ACTIVE_LOCK_MS * 10) } },
      { kind: "update", key: keys.rate(w, m, Math.floor(now / 60_000)), add: { count: 1 }, set: { ttl: ttlAfter(now, 3_600_000) },
        when: [{ any: [{ field: "count", op: "notExists" }, { field: "count", op: "<", value: planLimits.requestsPerMinute }] }] },
      { kind: "update", key: keys.dailyMessages(w, m, day), add: { count: 1 }, set: { ttl: ttlAfter(now, 35 * 24 * 3_600_000) },
        when: [{ any: [{ field: "count", op: "notExists" }, { field: "count", op: "<", value: planLimits.messagesPerDay }] }] },
      { kind: "check", key: keys.member(w, m), when: [{ field: "status", op: "=", value: "active" }] },
      { kind: "check", key: keys.workspace(w), when: [{ field: "plan", op: "=", value: account.plan }] },
      ...(metered ? [{ kind: "update" as const, key: keys.memberBudget(w, m, period),
        add: { reserved: request.units, exposure: request.units },
        when: [limit === null ? { field: "limit" as const, op: "notExists" as const }
          : { field: "limit" as const, op: "=" as const, value: limit },
          ...(limit === null ? [] : [{ field: "exposure" as const, op: "<=" as const, value: limit - request.units }])] }] : []),
      this.eventWrite(w, request.id, "reserve", request.units, { memberId: m, period, createdAt: now }),
    ];
    try {
      await this.store.transact(writes);
      return undefined;
    } catch (error) {
      if (!(error instanceof ConditionFailed)) throw error;
      const failed = new Set(error.failedIndexes);
      if (failed.has(0)) {
        const raced = await this.find(w, request.id, request.hash);
        if (raced) return raced;
      }
      if (failed.has(5)) throw new ServiceError("access_revoked", 403);
      if (failed.has(6)) throw new ServiceError("entitlement_changed", 409);
      if (failed.has(2)) throw new ServiceError("request_in_progress", 429);
      if (failed.has(3)) throw new ServiceError("rate_limited", 429);
      if (failed.has(4)) throw new ServiceError("daily_message_limit", 429);
      if (failed.has(1)) throw new ServiceError("insufficient_credits", 402);
      if (metered && failed.has(7)) throw new ServiceError("member_limit_exceeded", 402);
      throw error;
    }
  }

  /** Records that the paid provider call is about to begin. Refuses if the hold is gone. */
  async markProviderStarted(workspaceId: string, id: string) {
    try {
      await this.store.transact([{ kind: "update", key: keys.request(workspaceId, id),
        set: { providerState: "started", startedAt: this.clock() }, when: [{ field: "status", op: "=", value: "reserved" }] }]);
    } catch (error) {
      if (error instanceof ConditionFailed) throw new ServiceError("request_not_reserved", 409);
      throw error;
    }
  }

  async settle(workspaceId: string, id: string, s: Settlement) {
    for (const n of [s.charged, s.inputTokens, s.outputTokens]) {
      if (!Number.isSafeInteger(n) || n < 0) throw new Error("Invalid settlement");
    }
    const row = await this.store.get(keys.request(workspaceId, id));
    if (!row) throw new Error("Unknown reservation");
    if (row.status !== "reserved") return;
    const held = Number(row.reserved);
    if (s.charged > held) throw new Error("Charge exceeds reservation; reconcile manually");
    const now = this.clock();
    const member = String(row.memberId);
    try {
      await this.store.transact([
        { kind: "update", key: keys.request(workspaceId, id), when: [{ field: "status", op: "=", value: "reserved" }],
          set: { status: "completed", charged: s.charged, inputTokens: s.inputTokens, outputTokens: s.outputTokens,
            response: s.response, settledAt: now }, remove: ["gsi2pk", "gsi2sk"] },
        { kind: "update", key: keys.period(workspaceId, String(row.period)),
          add: { reserved: -held, used: s.charged, available: held - s.charged } },
        this.eventWrite(workspaceId, id, "settle", s.charged, { memberId: member, period: String(row.period), createdAt: now }),
        { kind: "update", key: keys.activity(workspaceId, member, new Date(now).toISOString().slice(0, 10)),
          add: { tokens: s.inputTokens + s.outputTokens, requests: 1, credits: s.charged } },
        ...(row.memberMetered === true ? [{ kind: "update" as const, key: keys.memberBudget(workspaceId, member, String(row.period)),
          add: { reserved: -held, used: s.charged, exposure: s.charged - held } }] : []),
      ]);
    } catch (error) {
      if (!(error instanceof ConditionFailed)) throw error;
      const current = await this.store.get(keys.request(workspaceId, id));
      if (current?.status !== "reserved") return;
      throw error;
    }
    await this.releaseLock(workspaceId, member, id);
  }

  /** Releases the full hold without charging. Idempotent; no-op once settled. */
  async fail(workspaceId: string, id: string, reason = "response_failed", reconciliation?: string) {
    const row = await this.store.get(keys.request(workspaceId, id));
    if (!row || row.status !== "reserved") return;
    const held = Number(row.reserved);
    const now = this.clock();
    try {
      await this.store.transact([
        { kind: "update", key: keys.request(workspaceId, id), when: [{ field: "status", op: "=", value: "reserved" }],
          set: { status: "failed", failureReason: reason, failedAt: now, ...(reconciliation ? { reconciliation } : {}) },
          remove: ["gsi2pk", "gsi2sk"] },
        { kind: "update", key: keys.period(workspaceId, String(row.period)), add: { reserved: -held, available: held } },
        this.eventWrite(workspaceId, id, "release", held, { memberId: String(row.memberId), period: String(row.period), createdAt: now, reason }),
        ...(row.memberMetered === true ? [{ kind: "update" as const,
          key: keys.memberBudget(workspaceId, String(row.memberId), String(row.period)),
          add: { reserved: -held, exposure: -held } }] : []),
      ]);
    } catch (error) {
      if (!(error instanceof ConditionFailed)) throw error;
      const current = await this.store.get(keys.request(workspaceId, id));
      if (current?.status !== "reserved") return;
      throw error;
    }
    await this.releaseLock(workspaceId, String(row.memberId), id);
  }

  /** Best-effort: which model answered, for the internal console. Never affects the request. */
  async recordModelUse(entry: ModelUseEntry) {
    await recordModelUse(this.store, entry, this.clock()).catch(() => undefined);
  }

  async activity(workspaceId: string, memberId: string) {
    const prefix = `ACT#${memberId}#`;
    const rows = await this.store.query(`WS#${workspaceId}`, prefix);
    return Object.fromEntries(rows.map(r => [r.sk.slice(prefix.length), Number(r.tokens ?? 0)]));
  }

  /**
   * Releases holds left by crashed workers. A request whose provider call had
   * started is flagged for provider-cost review; the customer is not charged for
   * an undelivered response. Terminal status prevents a second provider call.
   */
  async reconcile(options: { olderThanMs?: number; limit?: number } = {}) {
    const cutoff = this.clock() - (options.olderThanMs ?? STALE_RESERVATION_MS);
    const candidates = await this.store.queryIndex("gsi2", "RESERVED",
      { skBefore: String(cutoff).padStart(15, "0"), limit: options.limit ?? 100 });
    const result = { released: 0, providerCostReview: 0 };
    for (const c of candidates) {
      const current = await this.store.get(c);
      if (!current || current.status !== "reserved" || Number(current.createdAt) >= cutoff) continue;
      const started = current.providerState === "started";
      await this.fail(String(current.workspaceId), String(current.requestId),
        started ? "provider_outcome_unknown" : "expired_before_provider_call",
        started ? "provider_cost_review" : undefined);
      if (started) result.providerCostReview++; else result.released++;
    }
    return result;
  }

  private async releaseLock(workspaceId: string, memberId: string, id: string) {
    try {
      await this.store.transact([{ kind: "delete", key: keys.active(workspaceId, memberId),
        when: [{ field: "requestId", op: "=", value: id }] }]);
    } catch (error) {
      // Another request already replaced an expired lock, or it is gone.
      if (!(error instanceof ConditionFailed)) throw error;
    }
  }

  private eventWrite(workspaceId: string, ref: string, kind: string, units: number, extra: Record<string, string | number>): Write {
    return { kind: "put", when: [notExists], item: { ...keys.event(workspaceId, ref, kind), kind, units, ref, ...extra } };
  }
}

function toRecord(row: Item): RequestRecord {
  return {
    id: String(row.requestId), workspaceId: String(row.workspaceId), memberId: String(row.memberId),
    hash: String(row.hash), status: row.status as RequestRecord["status"],
    providerState: row.providerState as RequestRecord["providerState"],
    reserved: Number(row.reserved), charged: Number(row.charged),
    inputTokens: Number(row.inputTokens), outputTokens: Number(row.outputTokens),
    response: typeof row.response === "string" ? row.response : undefined,
    model: String(row.model), rateVersion: String(row.rateVersion), period: String(row.period),
    createdAt: Number(row.createdAt),
    failureReason: typeof row.failureReason === "string" ? row.failureReason : undefined,
    reconciliation: typeof row.reconciliation === "string" ? row.reconciliation : undefined,
  };
}
