"use client";

import { ArrowRight, Check, Info } from "lucide-react";

export type AriaPricingPlan = {
  id: string;
  name: string;
  /** Short title on the in-app upgrade cards */
  headline: string;
  price: string;
  priceSuffix: string;
  isNew?: boolean;
  highlights: string;
  features: { text: string; hint?: string }[];
  cta: string;
};

export const ARIA_PRICING_PLANS: AriaPricingPlan[] = [
  {
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
  },
  {
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
  },
  {
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
  },
];

type Props = {
  onSelectPlan: (planId: string, cta: string) => void;
};

export function AriaPricingGrid({ onSelectPlan }: Props) {
  return (
    <div className="aria-pricing-compare" role="list">
      {ARIA_PRICING_PLANS.map((plan) => (
        <article key={plan.id} className="aria-pricing-tier" role="listitem">
          <header className="aria-pricing-tier-head">
            <h3 className="aria-pricing-tier-name">{plan.name}</h3>
            {plan.isNew ? <span className="aria-pricing-new">New</span> : null}
          </header>

          <div className="aria-pricing-price">
            <span className="aria-pricing-price-value">${plan.price}</span>
            <span className="aria-pricing-price-suffix">{plan.priceSuffix}</span>
          </div>

          <p className="aria-pricing-highlights">{plan.highlights}</p>

          <ul className="aria-pricing-features">
            {plan.features.map((feature) => (
              <li key={feature.text}>
                <Check className="aria-pricing-check" size={12} strokeWidth={2} aria-hidden />
                <span className="aria-pricing-feature-text">{feature.text}</span>
                {feature.hint ? (
                  <span className="aria-pricing-feature-hint" title={feature.hint}>
                    <Info size={12} aria-label={feature.hint} />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={`aria-pricing-cta aria-pricing-cta--${plan.id}`}
            onClick={() => onSelectPlan(plan.id, plan.cta)}
          >
            <span className="aria-pricing-cta-label">{plan.cta}</span>
            <span className="aria-pricing-cta-icon-wrap" aria-hidden>
              <ArrowRight size={14} className="aria-pricing-cta-icon" />
            </span>
          </button>
        </article>
      ))}
    </div>
  );
}
