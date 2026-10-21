"use client";

import { useState } from "react";
import { ariaFetch, refreshAriaSession, useAriaSession } from "@/lib/aria-session";
import type { AriaPlanId } from "@/lib/aria-current-plan";

const plans: { id: AriaPlanId; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "pro", label: "Pro" },
  { id: "team", label: "Team" },
];

export function AriaLocalPlanSwitcher() {
  const session = useAriaSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!session.localDev || !session.workspace || session.workspace.role !== "owner") return null;

  const changePlan = async (plan: AriaPlanId) => {
    if (busy || plan === session.workspace?.plan) return;
    setBusy(true);
    setError("");
    try {
      const response = await ariaFetch("/api/auth/local-plan/", { method: "POST", body: JSON.stringify({ plan }) });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not switch plans.");
      }
      await refreshAriaSession();
      window.dispatchEvent(new Event("aria:credits-updated"));
      window.dispatchEvent(new Event("aria:team-updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not switch plans.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="aria-local-user-switcher" role="group" aria-label="Local development plan">
      <span className="aria-local-user-switcher__label">Test plan</span>
      <div className="aria-local-user-switcher__buttons">
        {plans.map(plan => (
          <button key={plan.id} type="button"
            className={plan.id === session.workspace?.plan ? "aria-local-user-switcher__btn is-active" : "aria-local-user-switcher__btn"}
            aria-pressed={plan.id === session.workspace?.plan} disabled={busy}
            onClick={() => void changePlan(plan.id)}>{plan.label}</button>
        ))}
      </div>
      {error ? <span className="aria-local-plan-error" role="alert">{error}</span> : null}
    </div>
  );
}
