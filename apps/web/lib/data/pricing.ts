export type PricingPlan = {
  slug: string;
  name: string;
  description: string;
  price: string;
  priceDetail: string;
  highlighted?: boolean;
  cta: string;
  ctaHref: string;
  features: string[];
};

export const pricingPlans: PricingPlan[] = [
  {
    slug: "starter",
    name: "Starter",
    description: "For small teams exploring AI-powered analytics and knowledge search.",
    price: "$49",
    priceDetail: "per user / month",
    cta: "Start free trial",
    ctaHref: "/contact",
    features: [
      "Up to 10 workspace users",
      "AI Knowledge Search",
      "Document uploads (5 GB)",
      "Basic analytics connections",
      "Email support",
    ],
  },
  {
    slug: "business",
    name: "Business",
    description: "For growing teams that need connected data, memory, and executive reporting.",
    price: "$129",
    priceDetail: "per user / month",
    highlighted: true,
    cta: "Try ARIA",
    ctaHref: "/contact",
    features: [
      "Unlimited workspace users",
      "Enterprise Analytics & Atlas",
      "Business Memory",
      "Bring Your Own Data",
      "Executive Reports",
      "Validation Engine",
      "Priority support",
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    description: "For organizations requiring security, scale, APIs, and dedicated support.",
    price: "Custom",
    priceDetail: "annual billing",
    cta: "Contact sales",
    ctaHref: "/contact",
    features: [
      "Everything in Business",
      "Intelligence APIs",
      "Multi-tenant workspaces",
      "Role-based access control",
      "Audit logging & compliance",
      "Dedicated success manager",
      "Custom SLAs",
    ],
  },
];

export const pricingFaqs = [
  {
    question: "Can I switch plans as my team grows?",
    answer:
      "Yes. You can upgrade or downgrade at any time. Changes take effect at the start of your next billing cycle, and we'll prorate any differences.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Starter and Business plans include a 14-day free trial with full access to plan features. No credit card required to begin.",
  },
  {
    question: "How does Enterprise pricing work?",
    answer:
      "Enterprise pricing is based on team size, data volume, and deployment requirements. Contact our sales team for a tailored quote.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept major credit cards for Starter and Business plans. Enterprise customers can pay via invoice and purchase order.",
  },
];

export const comparisonFeatures = [
  { name: "Workspace users", starter: "Up to 10", business: "Unlimited", enterprise: "Unlimited" },
  { name: "AI Knowledge Search", starter: true, business: true, enterprise: true },
  { name: "Enterprise Analytics", starter: false, business: true, enterprise: true },
  { name: "Business Memory", starter: false, business: true, enterprise: true },
  { name: "Bring Your Own Data", starter: false, business: true, enterprise: true },
  { name: "Executive Reports", starter: false, business: true, enterprise: true },
  { name: "Validation Engine", starter: false, business: true, enterprise: true },
  { name: "Intelligence APIs", starter: false, business: false, enterprise: true },
  { name: "Audit logging", starter: false, business: false, enterprise: true },
  { name: "Dedicated support", starter: false, business: "Priority", enterprise: "Dedicated" },
];
