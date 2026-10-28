"use client";

import {
  ARIA_SUBSCRIPTION_PLAN_IDS,
  DEFAULT_ARIA_SUBSCRIPTION_PLANS,
  toPricingPlan,
  type AriaPricingPlan,
  type AriaSubscriptionPlan,
  type AriaSubscriptionPlanId,
} from "@/lib/aria-subscription-plans";
import { useEffect, useState } from "react";

function mergeCatalog(
  patches: Partial<Record<AriaSubscriptionPlanId, AriaSubscriptionPlan>> | AriaSubscriptionPlan[],
): Record<AriaSubscriptionPlanId, AriaSubscriptionPlan> {
  const byId = Array.isArray(patches)
    ? Object.fromEntries(patches.map(plan => [plan.id, plan])) as Partial<Record<AriaSubscriptionPlanId, AriaSubscriptionPlan>>
    : patches;
  const out = { ...DEFAULT_ARIA_SUBSCRIPTION_PLANS };
  for (const id of ARIA_SUBSCRIPTION_PLAN_IDS) {
    if (byId[id]) out[id] = { ...out[id], ...byId[id], id };
  }
  return out;
}

export function useAriaSubscriptionPlans(options?: { admin?: boolean }) {
  const [plans, setPlans] = useState<AriaPricingPlan[]>(() =>
    ARIA_SUBSCRIPTION_PLAN_IDS.map(id => toPricingPlan(DEFAULT_ARIA_SUBSCRIPTION_PLANS[id])),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const path = options?.admin ? "/api/admin/subscription-plans/" : "/api/subscription-plans/";
    void (async () => {
      try {
        const response = await fetch(path, { credentials: options?.admin ? "same-origin" : "omit", cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { plans: AriaSubscriptionPlan[] | AriaPricingPlan[] };
        if (cancelled || !Array.isArray(body.plans)) return;
        const merged = mergeCatalog(body.plans as AriaSubscriptionPlan[]);
        const list = ARIA_SUBSCRIPTION_PLAN_IDS.map(id => merged[id]).filter(p => options?.admin || p.published);
        setPlans(list.map(toPricingPlan));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [options?.admin]);

  return { plans, loading };
}
