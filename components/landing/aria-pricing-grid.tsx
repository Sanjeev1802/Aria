"use client";

import {
  ARIA_SUBSCRIPTION_PLAN_IDS,
  DEFAULT_ARIA_SUBSCRIPTION_PLANS,
  toPricingPlan,
  type AriaPricingPlan,
} from "@/lib/aria-subscription-plans";
import { useAriaSubscriptionPlans } from "@/lib/use-aria-subscription-plans";
import { ArrowRight, Check, Info } from "lucide-react";

export type { AriaPricingPlan };

export const ARIA_PRICING_PLANS: AriaPricingPlan[] = ARIA_SUBSCRIPTION_PLAN_IDS.map(id =>
  toPricingPlan(DEFAULT_ARIA_SUBSCRIPTION_PLANS[id]),
);

type Props = {
  onSelectPlan: (planId: string, cta: string) => void;
};

export function AriaPricingGrid({ onSelectPlan }: Props) {
  const { plans } = useAriaSubscriptionPlans();
  return (
    <div className="aria-pricing-compare" role="list">
      {plans.map((plan) => (
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
