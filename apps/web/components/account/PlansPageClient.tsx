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
import { CheckIcon, SparklesIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/chat/ConfirmDialog";

export function PlansPageClient() {
  const router = useRouter();
  const [current, setCurrent] = useState<PlanId>("free");
  const [pending, setPending] = useState<PlanId | null>(null);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    setCurrent(loadPlanId());
  }, []);

  function confirmUpgrade() {
    if (!pending) return;
    savePlanId(pending);
    setCurrent(pending);
    setPending(null);
    router.push("/dashboard/usage");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/60">
          Current plan:{" "}
          <span className="font-medium text-foreground">
            {getPlan(current).name}
          </span>
        </p>
        <div className="inline-flex rounded-full border border-foreground/12 bg-card p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
              billing === "monthly"
                ? "bg-foreground text-background"
                : "text-foreground/55 hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
              billing === "yearly"
                ? "bg-foreground text-background"
                : "text-foreground/55 hover:text-foreground"
            }`}
          >
            Yearly <span className="text-accent">-20%</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === current;
          const yearlyLabel =
            plan.priceLabel === "Custom" || plan.priceLabel === "$0"
              ? plan.priceLabel
              : `$${Math.round(Number(plan.priceLabel.replace("$", "")) * 12 * 0.8)}`;

          return (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-5 sm:p-6 ${
                plan.featured
                  ? "border-accent/50 bg-card shadow-[0_0_0_1px_rgba(216,138,104,0.15)]"
                  : "border-foreground/10 bg-card"
              }`}
            >
              {plan.featured ? (
                <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-foreground uppercase">
                  <SparklesIcon className="size-3" />
                  Popular
                </span>
              ) : null}

              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {plan.name}
              </h2>
              <p className="mt-1 font-serif text-sm leading-relaxed text-foreground/60">
                {plan.description}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight text-foreground">
                  {billing === "yearly" && plan.id !== "enterprise" && plan.id !== "free"
                    ? yearlyLabel
                    : plan.priceLabel}
                </span>
                <span className="text-sm text-foreground/45">
                  {plan.id === "enterprise"
                    ? plan.priceDetail
                    : billing === "yearly" && plan.id !== "free"
                      ? "/ year"
                      : plan.priceDetail}
                </span>
              </div>

              <ul className="mt-5 flex flex-1 flex-col gap-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-foreground/75"
                  >
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-accent" />
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
                className={`mt-6 inline-flex h-10 w-full items-center justify-center rounded-full text-sm font-medium transition-opacity ${
                  isCurrent
                    ? "cursor-default border border-foreground/15 bg-transparent text-foreground/50"
                    : plan.featured
                      ? "bg-foreground text-background hover:opacity-90"
                      : "bg-foreground/[0.08] text-foreground hover:bg-foreground/[0.12]"
                }`}
              >
                {isCurrent ? "Current plan" : plan.cta}
              </button>
            </article>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={
          pending
            ? pending === "free"
              ? "Switch to Free?"
              : `Upgrade to ${getPlan(pending).name}?`
            : "Change plan?"
        }
        description={
          pending
            ? pending === "free"
              ? "You’ll keep chat access with the Free token limit. This is a demo change stored on this device."
              : `You’ll unlock the ${getPlan(pending).name} token limit (${getPlan(pending).tokenLimit.toLocaleString()} tokens / month). Billing is simulated for this demo.`
            : ""
        }
        confirmLabel={pending === "free" ? "Switch to Free" : "Confirm upgrade"}
        cancelLabel="Cancel"
        onCancel={() => setPending(null)}
        onConfirm={confirmUpgrade}
      />
    </div>
  );
}
