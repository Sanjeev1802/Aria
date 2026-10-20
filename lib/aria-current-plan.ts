import {
  ARIA_PRICING_PLANS,
  type AriaPricingPlan,
} from "@/components/landing/aria-pricing-grid";

export type AriaPlanId = "free" | "pro" | "team";

/** Plan shown only in the scripted design preview. Live plans come from the server session. */
export const ARIA_PREVIEW_PLAN_ID: AriaPlanId = "team";

export function getAriaPricingPlan(planId: string | undefined): AriaPricingPlan | undefined {
  return ARIA_PRICING_PLANS.find((plan) => plan.id === planId);
}
