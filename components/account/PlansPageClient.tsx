"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PLANS,
  getPlan,
  loadPlanId,
  savePlanId,
  type PlanId,
} from "@/lib/aria/plans";
import { CheckIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/chat/ConfirmDialog";

export function PlansPageClient() {
  const router = useRouter();
  const [current, setCurrent] = useState<PlanId>("free");
  const [pending, setPending] = useState<PlanId | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate selected plan
    setCurrent(loadPlanId());
  }, []);

  function confirmUpgrade() {
    if (!pending) return;
    savePlanId(pending);
    setCurrent(pending);
    setPending(null);
    router.push("/dashboard");
  }

  return (
    <div className="space-y-8">
      <p className="text-[14px] text-foreground/55">
        You’re on{" "}
        <span className="font-medium text-foreground">
          {getPlan(current).name}
        </span>
        . Choose the plan that fits how you work.
      </p>

      <div className="grid gap-4 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === current;

          return (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-5 ${
                plan.featured
                  ? "border-foreground/25 bg-card shadow-[0_1px_0_rgba(20,20,19,0.04)]"
                  : "border-foreground/10 bg-card/70"
              }`}
            >
              {plan.featured ? (
                <span className="mb-3 inline-flex w-fit rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold tracking-wide text-background uppercase">
                  Popular
                </span>
              ) : (
                <span className="mb-3 inline-block h-[18px]" aria-hidden />
              )}

              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {plan.name}
              </h2>
              <p className="mt-1.5 min-h-[3.25rem] text-[13px] leading-relaxed text-foreground/55">
                {plan.description}
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-[2rem] font-semibold tracking-tight text-foreground">
                  {plan.priceLabel}
                </span>
                {plan.id !== "enterprise" ? (
                  <span className="text-[13px] text-foreground/45">
                    {plan.priceDetail}
                  </span>
                ) : null}
              </div>
              {plan.id === "enterprise" ? (
                <p className="mt-1 text-[13px] text-foreground/45">
                  {plan.priceDetail}
                </p>
              ) : null}

              <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[13px] text-foreground/70"
                  >
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-foreground/50" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={isCurrent}
                onClick={() => {
                  if (plan.id === "enterprise") {
                    window.location.href = "/contact";
                    return;
                  }
                  setPending(plan.id);
                }}
                className={`mt-6 inline-flex h-10 w-full items-center justify-center rounded-full text-[13px] font-medium transition-opacity ${
                  isCurrent
                    ? "cursor-default border border-foreground/12 bg-transparent text-foreground/45"
                    : plan.featured
                      ? "bg-foreground text-background hover:opacity-90"
                      : plan.id === "enterprise"
                        ? "border border-foreground/15 bg-transparent text-foreground hover:bg-foreground/5"
                        : "bg-foreground/[0.08] text-foreground hover:bg-foreground/[0.12]"
                }`}
              >
                {isCurrent ? "Current plan" : plan.cta}
              </button>
            </article>
          );
        })}
      </div>

      <p className="text-[12px] text-foreground/40">
        Business includes organization seats with Admin and User roles. Enterprise
        pricing is custom — contact the Aria team.
      </p>

      <ConfirmDialog
        open={Boolean(pending)}
        title={
          pending
            ? pending === "free"
              ? "Switch to Free?"
              : `Switch to ${getPlan(pending).name}?`
            : "Change plan?"
        }
        description={
          pending
            ? pending === "free"
              ? "You’ll keep chat access with Free limits. This demo change is stored on this device."
              : pending === "business"
                ? "You’ll unlock Team management with Admin and User roles. Billing is simulated for this demo."
                : `You’ll unlock the ${getPlan(pending).name} limits. Billing is simulated for this demo.`
            : ""
        }
        confirmLabel={pending === "free" ? "Switch to Free" : "Confirm"}
        cancelLabel="Cancel"
        onCancel={() => setPending(null)}
        onConfirm={confirmUpgrade}
      />
    </div>
  );
}
