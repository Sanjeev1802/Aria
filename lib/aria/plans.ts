export type PlanId = "free" | "pro" | "business" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceDetail: string;
  tokenLimit: number;
  featured?: boolean;
  description: string;
  features: string[];
  cta: string;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    priceDetail: "per month",
    tokenLimit: 100_000,
    description: "Try ARIA for everyday questions and light exploration.",
    features: [
      "Limited messages each day",
      "Standard model access",
      "Chat history on this device",
      "File uploads up to 5 MB",
    ],
    cta: "Your current plan",
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$99",
    priceDetail: "per month",
    tokenLimit: 2_000_000,
    featured: true,
    description: "More usage, priority access, and stronger models for daily work.",
    features: [
      "Higher message limits",
      "Priority response speed",
      "Advanced analysis tools",
      "Larger file uploads",
      "Early access to new models",
    ],
    cta: "Upgrade to Pro",
  },
  {
    id: "business",
    name: "Business",
    priceLabel: "$199",
    priceDetail: "per user / month",
    tokenLimit: 8_000_000,
    description: "Team workspaces with admin controls for organizations.",
    features: [
      "Everything in Pro",
      "Organization users & roles",
      "Admin invite / remove members",
      "Shared workspace controls",
      "Usage analytics for your team",
      "Priority support",
    ],
    cta: "Upgrade to Business",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom",
    priceDetail: "contact Aria team",
    tokenLimit: 50_000_000,
    description: "Security, compliance, and dedicated capacity at scale.",
    features: [
      "Custom limits & SLAs",
      "SSO and advanced admin",
      "Security reviews & DPA",
      "Dedicated success manager",
      "Custom integrations",
    ],
    cta: "Contact Aria team",
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function isTeamPlan(id: PlanId): boolean {
  return id === "business" || id === "enterprise";
}

const PLAN_KEY = "aria.workspace.plan.v1";

export function loadPlanId(): PlanId {
  if (typeof window === "undefined") return "free";
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (raw === "plus") return "pro";
    if (
      raw === "pro" ||
      raw === "business" ||
      raw === "enterprise" ||
      raw === "free"
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "free";
}

export function savePlanId(id: PlanId) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAN_KEY, id);
}
