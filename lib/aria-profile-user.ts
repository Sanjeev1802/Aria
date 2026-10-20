import { ARIA_PREVIEW_PLAN_ID, getAriaPricingPlan } from "@/lib/aria-current-plan";

/** Persona for the scripted design preview only. Live data comes from `useAriaProfile`. */
export const ARIA_PREVIEW_PROFILE = {
  name: "Gokulakrishnan",
  handle: "gokulakrishnan",
  email: "gokulakrishnan@example.com",
  planId: ARIA_PREVIEW_PLAN_ID,
  planLabel: getAriaPricingPlan(ARIA_PREVIEW_PLAN_ID)?.name ?? "Team",
  avatar: "",
} as const;
