export type PlanId = "free" | "plus" | "business" | "enterprise";

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
    description: "Get started with ARIA for everyday business questions.",
    features: [
      "100k tokens / month",
      "Standard response speed",
      "Chat history on this device",
      "File uploads (5 MB)",
    ],
    cta: "Your current plan",
  },
  {
    id: "plus",
    name: "Plus",
    priceLabel: "$20",
    priceDetail: "per month",
    tokenLimit: 1_000_000,
    featured: true,
    description: "Higher limits and priority access for power users.",
    features: [
      "1M tokens / month",
      "Priority response speed",
      "Advanced analysis tools",
      "Larger file uploads",
      "Early access to new models",
    ],
    cta: "Upgrade to Plus",
  },
  {
    id: "business",
    name: "Business",
    priceLabel: "$30",
    priceDetail: "per user / month",
    tokenLimit: 5_000_000,
    description: "Workspace controls and shared knowledge for teams.",
    features: [
      "5M tokens / user / month",
      "Admin controls & SSO prep",
      "Shared workspace memory",
      "Usage analytics",
      "Priority support",
    ],
    cta: "Upgrade to Business",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom",
    priceDetail: "contact sales",
    tokenLimit: 50_000_000,
    description: "Security, compliance, and dedicated capacity at scale.",
    features: [
      "Custom token limits",
      "Dedicated infrastructure options",
      "Security reviews & DPA",
      "SLA & success manager",
      "Custom integrations",
    ],
    cta: "Contact sales",
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

const PLAN_KEY = "aria.workspace.plan.v1";

export function loadPlanId(): PlanId {
  if (typeof window === "undefined") return "free";
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (raw === "plus" || raw === "business" || raw === "enterprise" || raw === "free") {
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
