import { randomUUID } from "node:crypto";
import { keys } from "./accounting/credit-ledger";
import { isPlanId, PLANS } from "./accounts/entitlements";
import { ServiceError } from "./errors";
import { readJson } from "./handlers";
import { requireWorkspace } from "./request-context";
import type { Services } from "./services";
import { ConditionFailed } from "./store/types";

/** Local-demo only. Real plan changes must come from verified billing events. */
export async function localPlanHandler(request: Request, services: Services) {
  if (!services.config.localIdentity || services.config.environment !== "development" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)) {
    throw new ServiceError("local_development_only", 403);
  }
  const ctx = await requireWorkspace(request, services, "billing:manage");
  if (ctx.membership.role !== "owner") throw new ServiceError("permission_denied", 403);
  const body = await readJson(request);
  if (!isPlanId(body.plan)) throw new ServiceError("invalid_plan", 400);
  const plan = body.plan;
  if (ctx.workspace.seatsUsed > PLANS[plan].seats) throw new ServiceError("local_plan_seats_exceeded", 409);

  const period = await services.ledger.ensurePeriodGrant(ctx.workspace.id, ctx.workspace.plan);
  const periodKey = keys.period(ctx.workspace.id, period);
  const row = await services.store.get(periodKey);
  if (!row) throw new ServiceError("service_unavailable", 503);
  const used = Number(row.used);
  const reserved = Number(row.reserved);
  if (reserved !== 0) throw new ServiceError("local_plan_request_in_progress", 409);
  const granted = PLANS[plan].monthlyUnits;
  try {
    await services.store.transact([
      { kind: "update", key: keys.workspace(ctx.workspace.id),
        set: { plan, seatLimit: PLANS[plan].seats, localPlanChangedAt: Date.now() },
        when: [{ field: "plan", op: "=", value: ctx.workspace.plan },
          { field: "seatsUsed", op: "<=", value: PLANS[plan].seats }] },
      { kind: "update", key: periodKey,
        set: { granted, available: Math.max(0, granted - used), plan },
        when: [{ field: "used", op: "=", value: used }, { field: "reserved", op: "=", value: 0 }] },
      { kind: "check", key: keys.member(ctx.workspace.id, ctx.user.id),
        when: [{ field: "status", op: "=", value: "active" }, { field: "role", op: "=", value: "owner" }] },
      { kind: "put", item: { pk: `WS#${ctx.workspace.id}`, sk: `LOCALPLAN#${Date.now()}#${randomUUID()}`,
        previousPlan: ctx.workspace.plan, plan, changedBy: ctx.user.id } },
    ]);
  } catch (error) {
    if (error instanceof ConditionFailed) throw new ServiceError("local_plan_conflict", 409);
    throw error;
  }
  return Response.json({ ok: true, plan, credits: granted / 1000 }, { headers: { "Cache-Control": "no-store" } });
}
