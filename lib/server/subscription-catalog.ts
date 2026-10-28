import {
  ARIA_SUBSCRIPTION_PLAN_IDS,
  DEFAULT_ARIA_SUBSCRIPTION_PLANS,
  type AriaSubscriptionPlan,
  type AriaSubscriptionPlanId,
} from "@/lib/aria-subscription-plans";
import { PLANS, type Entitlement, type PlanId } from "./accounts/entitlements";
import { ServiceError } from "./errors";
import type { Store } from "./store/types";
import type { Services } from "./services";

const CATALOG_KEY = { pk: "PLATFORM", sk: "SUBSCRIPTION#CATALOG" };

export type StoredSubscriptionCatalog = {
  plans: Partial<Record<AriaSubscriptionPlanId, Partial<AriaSubscriptionPlan>>>;
  updatedAt?: number;
  updatedBy?: string;
};

function isPlanId(value: string): value is AriaSubscriptionPlanId {
  return (ARIA_SUBSCRIPTION_PLAN_IDS as readonly string[]).includes(value);
}

function mergePlan(
  id: AriaSubscriptionPlanId,
  patch?: Partial<AriaSubscriptionPlan>,
): AriaSubscriptionPlan {
  const base = DEFAULT_ARIA_SUBSCRIPTION_PLANS[id];
  if (!patch) return { ...base };
  return {
    ...base,
    ...patch,
    id,
    features: patch.features?.length ? patch.features : base.features,
  };
}

function parsePlansJson(raw: unknown): StoredSubscriptionCatalog["plans"] | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return undefined;
    return parsed as StoredSubscriptionCatalog["plans"];
  } catch {
    return undefined;
  }
}

export async function readStoredCatalog(store: Store): Promise<StoredSubscriptionCatalog | undefined> {
  const row = await store.get(CATALOG_KEY);
  if (!row) return undefined;
  const plans = parsePlansJson(row.plansJson);
  if (!plans) return undefined;
  return {
    plans,
    updatedAt: typeof row.updatedAt === "number" ? row.updatedAt : undefined,
    updatedBy: typeof row.updatedBy === "string" ? row.updatedBy : undefined,
  };
}

export async function getSubscriptionCatalog(services: Services): Promise<{
  plans: Record<AriaSubscriptionPlanId, AriaSubscriptionPlan>;
  updatedAt?: number;
  updatedBy?: string;
}> {
  const stored = await readStoredCatalog(services.store);
  const plans = {} as Record<AriaSubscriptionPlanId, AriaSubscriptionPlan>;
  for (const id of ARIA_SUBSCRIPTION_PLAN_IDS) {
    plans[id] = mergePlan(id, stored?.plans?.[id]);
  }
  return { plans, updatedAt: stored?.updatedAt, updatedBy: stored?.updatedBy };
}

export async function getPublishedSubscriptionPlans(services: Services): Promise<AriaSubscriptionPlan[]> {
  const { plans } = await getSubscriptionCatalog(services);
  return ARIA_SUBSCRIPTION_PLAN_IDS.map(id => plans[id]).filter(plan => plan.published);
}

export async function monthlyUnitsForPlan(store: Store, plan: PlanId): Promise<number> {
  const stored = await readStoredCatalog(store);
  const credits = stored?.plans?.[plan]?.monthlyCredits;
  if (typeof credits === "number" && Number.isFinite(credits) && credits > 0) {
    return Math.round(credits * 1000);
  }
  return PLANS[plan].monthlyUnits;
}

export async function seatLimitForPlan(store: Store, plan: PlanId): Promise<number> {
  const stored = await readStoredCatalog(store);
  const seats = stored?.plans?.[plan]?.seats;
  if (typeof seats === "number" && Number.isInteger(seats) && seats > 0) return seats;
  return PLANS[plan].seats;
}

export async function entitlementForPlan(store: Store, plan: PlanId): Promise<Entitlement> {
  const base = PLANS[plan];
  const [monthlyUnits, seats] = await Promise.all([
    monthlyUnitsForPlan(store, plan),
    seatLimitForPlan(store, plan),
  ]);
  const stored = await readStoredCatalog(store);
  const patch = stored?.plans?.[plan];
  return {
    ...base,
    monthlyUnits,
    seats,
    apiAccess: typeof patch?.apiAccess === "boolean" ? patch.apiAccess : base.apiAccess,
    teamManagement: typeof patch?.teamManagement === "boolean" ? patch.teamManagement : base.teamManagement,
  };
}

function sanitizeFeature(value: unknown): { text: string; hint?: string } | null {
  if (!value || typeof value !== "object") return null;
  const text = "text" in value && typeof value.text === "string" ? value.text.trim() : "";
  if (!text || text.length > 240) return null;
  const hint = "hint" in value && typeof value.hint === "string" ? value.hint.trim().slice(0, 240) : undefined;
  return hint ? { text, hint } : { text };
}

function sanitizePlanPatch(id: AriaSubscriptionPlanId, raw: unknown): Partial<AriaSubscriptionPlan> {
  if (!raw || typeof raw !== "object") throw new ServiceError("subscription_plan_invalid", 400);
  const input = raw as Record<string, unknown>;
  const patch: Partial<AriaSubscriptionPlan> = {};

  const str = (key: keyof AriaSubscriptionPlan, max: number) => {
    const v = input[key];
    if (v === undefined) return;
    if (typeof v !== "string" || !v.trim() || v.trim().length > max) {
      throw new ServiceError("subscription_plan_invalid", 400);
    }
    (patch as Record<string, string>)[key] = v.trim();
  };

  str("name", 48);
  str("headline", 120);
  str("price", 16);
  str("priceSuffix", 32);
  str("highlights", 280);
  str("cta", 48);

  if ("isNew" in input) patch.isNew = Boolean(input.isNew);
  if ("published" in input) patch.published = Boolean(input.published);
  if ("apiAccess" in input) patch.apiAccess = Boolean(input.apiAccess);
  if ("teamManagement" in input) patch.teamManagement = Boolean(input.teamManagement);

  if ("monthlyCredits" in input) {
    const n = Number(input.monthlyCredits);
    if (!Number.isInteger(n) || n < 1 || n > 1_000_000) throw new ServiceError("subscription_plan_invalid", 400);
    patch.monthlyCredits = n;
  }
  if ("seats" in input) {
    const n = Number(input.seats);
    if (!Number.isInteger(n) || n < 1 || n > 500) throw new ServiceError("subscription_plan_invalid", 400);
    patch.seats = n;
  }

  if ("features" in input) {
    if (!Array.isArray(input.features) || input.features.length < 1 || input.features.length > 24) {
      throw new ServiceError("subscription_plan_invalid", 400);
    }
    const features = input.features.map(sanitizeFeature).filter((f): f is { text: string; hint?: string } => f !== null);
    if (features.length < 1) throw new ServiceError("subscription_plan_invalid", 400);
    patch.features = features;
  }

  if (id === "free" && ("teamManagement" in patch || patch.teamManagement)) {
    patch.teamManagement = false;
  }

  return patch;
}

export type SubscriptionCatalogUpdate = {
  plans: Partial<Record<AriaSubscriptionPlanId, Partial<AriaSubscriptionPlan>>>;
};

export async function updateSubscriptionCatalog(
  services: Services,
  actorId: string,
  body: unknown,
): Promise<{ plans: Record<AriaSubscriptionPlanId, AriaSubscriptionPlan>; updatedAt: number }> {
  if (!body || typeof body !== "object" || !("plans" in body) || typeof (body as { plans: unknown }).plans !== "object") {
    throw new ServiceError("subscription_plan_invalid", 400);
  }
  const incoming = (body as SubscriptionCatalogUpdate).plans;
  const existing = await readStoredCatalog(services.store);
  const mergedPlans: StoredSubscriptionCatalog["plans"] = { ...(existing?.plans ?? {}) };

  for (const [key, value] of Object.entries(incoming)) {
    if (!isPlanId(key)) continue;
    if (key === "free" && value && typeof value === "object") {
      const patch = sanitizePlanPatch(key, value);
      delete patch.teamManagement;
      mergedPlans[key] = { ...mergedPlans[key], ...patch };
      continue;
    }
    if (key === "pro" || key === "team") {
      mergedPlans[key] = { ...mergedPlans[key], ...sanitizePlanPatch(key, value) };
    }
  }

  const updatedAt = Date.now();
  await services.store.transact([
    {
      kind: "put",
      item: {
        ...CATALOG_KEY,
        plansJson: JSON.stringify(mergedPlans),
        updatedAt,
        updatedBy: actorId,
      },
    },
  ]);

  const { plans } = await getSubscriptionCatalog(services);
  return { plans, updatedAt };
}
