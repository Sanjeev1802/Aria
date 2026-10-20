"use client";

import {
  ARIA_PRICING_PLANS,
  type AriaPricingPlan,
} from "@/components/landing/aria-pricing-grid";
import { Button } from "@/components/ui/button";
import { Card, CardAction } from "@/components/ui/card";
import { useAriaSession } from "@/lib/aria-session";
import { cn } from "@/lib/utils";
import { useNav } from "@openuidev/react-ui";
import { Check, Info, Sparkles, X } from "lucide-react";
import { useCallback, useEffect } from "react";

const PRICING_FOOTNOTE = (
  <>
    Proposed launch pricing in USD. No checkout is enabled in this preview.
    <br />
    Model usage varies. Business data requires separate authorization and may carry additional
    charges.
  </>
);

function FeatureList({ plan }: { plan: AriaPricingPlan }) {
  const featured = plan.id === "team";
  return (
    <ul
      className={cn("aria-pricing__features", featured && "aria-pricing__features--featured")}
    >
      {plan.features.map((feature) => (
        <li key={feature.text}>
          <Check className="aria-pricing__feature-icon" size={18} strokeWidth={2} aria-hidden />
          <span>{feature.text}</span>
          {feature.hint ? (
            <span className="aria-pricing__feature-hint" title={feature.hint}>
              <Info size={14} aria-label={feature.hint} />
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function upgradePlanName(plan: AriaPricingPlan): string {
  return plan.id === "team" ? "Max" : plan.name;
}

function ctaForPlan(plan: AriaPricingPlan, isCurrent: boolean): string {
  if (isCurrent) return "Your current plan";
  if (plan.id === "team") return "Get Max";
  return plan.cta;
}

export function AriaPricingView() {
  const currentPlanId = useAriaSession().workspace?.plan;
  const { navigate } = useNav();
  const close = useCallback(() => navigate(undefined), [navigate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  return (
    <div className="aria-settings-modal-overlay" role="presentation" onClick={close}>
      <Card
        className="aria-settings-modal-card aria-overlay-dialog relative z-[1] gap-0 overflow-hidden bg-card p-0 shadow-2xl ring-foreground/15"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Upgrade plan"
      >
        <CardAction className="absolute top-3 right-3 z-10">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Close" onClick={close}>
            <X className="size-4" />
          </Button>
        </CardAction>
        <div className="aria-overlay-dialog__body aria-pricing-dialog">
        <header className="aria-pricing__page-head">
          <h1 className="aria-pricing__page-title">Upgrade plan</h1>
          <p className="aria-pricing__page-sub">Free, Pro, and Max (Team).</p>
        </header>

        <div className="aria-pricing__grid" role="list">
          {ARIA_PRICING_PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isTeam = plan.id === "team";
            const isPro = plan.id === "pro";

            return (
              <article
                key={plan.id}
                className={cn(
                  "aria-pricing__card",
                  isCurrent && "aria-pricing__card--current",
                  isTeam && "aria-pricing__card--featured",
                )}
                role="listitem"
              >
                <div className="aria-pricing__card-top">
                  <span className="aria-pricing__plan-label">{upgradePlanName(plan)}</span>
                  {isTeam ? <span className="aria-pricing__badge">Team</span> : null}
                </div>

                <h2 className="aria-pricing__headline">{plan.headline}</h2>
                <p className="aria-pricing__description">{plan.highlights}</p>

                <button
                  type="button"
                  className={cn(
                    "aria-pricing__cta",
                    isCurrent && "aria-pricing__cta--current",
                    isPro && "aria-pricing__cta--primary",
                    isTeam && "aria-pricing__cta--featured",
                    plan.id === "free" && !isCurrent && "aria-pricing__cta--primary",
                  )}
                  disabled={isCurrent}
                >
                  {isTeam ? <Sparkles size={16} strokeWidth={1.75} aria-hidden /> : null}
                  {ctaForPlan(plan, isCurrent)}
                </button>

                <p className="aria-pricing__price-line">
                  <span className="aria-pricing__price-currency">$</span>
                  <span className="aria-pricing__price-amount">{plan.price}</span>
                  <span className="aria-pricing__price-suffix">{plan.priceSuffix}</span>
                </p>

                <FeatureList plan={plan} />
              </article>
            );
          })}
        </div>

        <p className="aria-pricing__page-footnote">{PRICING_FOOTNOTE}</p>
        </div>
      </Card>
    </div>
  );
}
