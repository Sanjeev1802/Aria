/** Customer-facing subscription tiers (Free, Pro, Team) — shared by pricing UI and Internal console. */
export type AriaSubscriptionPlanId = "free" | "pro" | "team";

export type AriaSubscriptionFeature = { text: string; hint?: string };

export type AriaSubscriptionPlan = {
  id: AriaSubscriptionPlanId;
  name: string;
  headline: string;
  price: string;
  priceSuffix: string;
  isNew?: boolean;
  highlights: string;
  features: AriaSubscriptionFeature[];
  cta: string;
  /** Shown on /pricing and upgrade modal when true. */
  published: boolean;
  /** Integer credits per UTC month (1 credit = 1,000 millicredits in ledger). */
  monthlyCredits: number;
  seats: number;
  apiAccess: boolean;
  teamManagement: boolean;
};

export const ARIA_SUBSCRIPTION_PLAN_IDS: AriaSubscriptionPlanId[] = ["free", "pro", "team"];

export const DEFAULT_ARIA_SUBSCRIPTION_PLANS: Record<AriaSubscriptionPlanId, AriaSubscriptionPlan> = {
  free: {
    id: "free",
    name: "Free",
    headline: "Everyday workspace",
    price: "0",
    priceSuffix: "/mo",
    highlights: "200 credits/mo · General workspace · Amazon Nova · Personal use",
    features: [
      { text: "Everyday AI conversations in General mode" },
      { text: "Conversation history stored in your browser (preview)" },
      { text: "Amazon Nova through Bedrock" },
      { text: "Personal exploration — no card required" },
      { text: "Upgrade anytime for Intelligence & API" },
    ],
    cta: "Get Free",
    published: true,
    monthlyCredits: 200,
    seats: 1,
    apiAccess: false,
    teamManagement: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    headline: "Intelligence & API",
    price: "12",
    priceSuffix: "/mo",
    highlights: "6,000 credits/mo · ARIA Intelligence · Amazon Nova · Developer API",
    features: [
      { text: "Everything in Free" },
      { text: "ARIA Intelligence with source-linked answers (preview UI)" },
      { text: "Higher monthly credit allowance" },
      { text: "Developer API access with scoped keys (planned)" },
      { text: "File uploads in workspace flows" },
      { text: "Commercial use for solo operators & freelancers" },
    ],
    cta: "Get Pro",
    published: true,
    monthlyCredits: 6_000,
    seats: 1,
    apiAccess: true,
    teamManagement: false,
  },
  team: {
    id: "team",
    name: "Team",
    headline: "Built for teams",
    price: "39",
    priceSuffix: "/workspace/mo",
    isNew: true,
    highlights: "20,000 shared credits/mo · 5 seats · Admin controls · Team API keys",
    features: [
      { text: "Everything in Pro for your workspace" },
      { text: "Five seats included (+ additional seats at Pro rate)" },
      { text: "Shared credit pool and usage visibility" },
      { text: "Admin invites, roles, and approved data connections" },
      { text: "Project-scoped API keys for shipping together" },
      { text: "Team-wide commercial license (preview terms)" },
      { text: "Priority support channel when ARIA launches", hint: "Planned for GA" },
    ],
    cta: "Get Team",
    published: true,
    monthlyCredits: 20_000,
    seats: 5,
    apiAccess: true,
    teamManagement: true,
  },
};

export function ariaSubscriptionPlansList(
  catalog: Record<AriaSubscriptionPlanId, AriaSubscriptionPlan>,
): AriaSubscriptionPlan[] {
  return ARIA_SUBSCRIPTION_PLAN_IDS.map(id => catalog[id]);
}

/** Pricing cards use the same shape as the legacy export. */
export type AriaPricingPlan = Omit<AriaSubscriptionPlan, "published" | "monthlyCredits" | "seats" | "apiAccess" | "teamManagement">;

export function toPricingPlan(plan: AriaSubscriptionPlan): AriaPricingPlan {
  const { published: _p, monthlyCredits: _m, seats: _s, apiAccess: _a, teamManagement: _t, ...rest } = plan;
  return rest;
}
