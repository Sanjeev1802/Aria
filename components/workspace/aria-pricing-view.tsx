"use client";

import type { AriaPricingPlan } from "@/components/landing/aria-pricing-grid";
import { useAriaSubscriptionPlans } from "@/lib/use-aria-subscription-plans";
import { AriaWorkspaceOverlay } from "@/components/workspace/aria-workspace-overlay";
import { useAriaSession } from "@/lib/aria-session";
import { switchAriaPlan } from "@/lib/aria-plan-switch";
import type { AriaPlanId } from "@/lib/aria-current-plan";

const PLAN_IDS: readonly string[] = ["free", "pro", "team"] satisfies AriaPlanId[];
const isPlanId = (id: string): id is AriaPlanId => PLAN_IDS.includes(id);
import { cn } from "@/lib/utils";
import { useNav } from "@openuidev/react-ui";
import { Check, Info, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

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

function ctaForPlan(plan: AriaPricingPlan, isCurrent: boolean, switching: boolean): string {
  if (isCurrent) return "Your current plan";
  if (switching) return "Switching…";
  if (plan.id === "team") return "Get Max";
  return plan.cta;
}

export function AriaPricingView() {
  const { plans } = useAriaSubscriptionPlans();
  const session = useAriaSession();
  const currentPlanId = session.workspace?.plan;
  // Development stage: the normal upgrade buttons change the plan instantly, with no charge.
  const devSwitching = Boolean(session.planSwitching ?? session.localDev);
  const canSwitch = devSwitching && session.workspace?.role === "owner";
  const [switchingTo, setSwitchingTo] = useState<AriaPricingPlan["id"] | null>(null);
  const [switchError, setSwitchError] = useState("");
  const choosePlan = async (planId: AriaPricingPlan["id"]) => {
    if (switchingTo || !isPlanId(planId)) return;
    setSwitchingTo(planId);
    setSwitchError("");
    try { await switchAriaPlan(planId); }
    catch (cause) { setSwitchError(cause instanceof Error ? cause.message : "Could not switch plans."); }
    finally { setSwitchingTo(null); }
  };
  const { navigate } = useNav();
  const close = useCallback(() => navigate(undefined), [navigate]);

  return (
    <AriaWorkspaceOverlay label="Upgrade plan" onClose={close} className="aria-overlay-dialog">
        <div className="aria-overlay-dialog__body aria-pricing-dialog">
        <header className="aria-pricing__page-head">
          <h1 className="aria-pricing__page-title">Upgrade plan</h1>
          <p className="aria-pricing__page-sub">Free, Pro, and Max (Team).</p>
        </header>

        <div className="aria-pricing__grid" role="list">
          {plans.map((plan) => {
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
                  disabled={isCurrent || (canSwitch && switchingTo !== null)}
                  onClick={canSwitch && !isCurrent ? () => void choosePlan(plan.id) : undefined}
                >
                  {isTeam ? <Sparkles size={16} strokeWidth={1.75} aria-hidden /> : null}
                  {ctaForPlan(plan, isCurrent, switchingTo === plan.id)}
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

        {switchError ? <p className="aria-pricing__page-footnote" role="alert">{switchError}</p> : null}
        <p className="aria-pricing__page-footnote">
          {devSwitching
            ? canSwitch
              ? "Development mode: plan changes apply instantly and nothing is charged."
              : "Development mode: only the workspace owner can change the plan."
            : PRICING_FOOTNOTE}
        </p>
        </div>
    </AriaWorkspaceOverlay>
  );
}
