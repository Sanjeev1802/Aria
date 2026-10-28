import { ariaFetch, refreshAriaSession } from "./aria-session";
import type { AriaPlanId } from "./aria-current-plan";

/**
 * Development stage only: changes the workspace plan without billing. The
 * server allows it only when ARIA_PLAN_SWITCHING is enabled (or in local demo
 * mode) and only for the workspace owner.
 */
export async function switchAriaPlan(plan: AriaPlanId) {
  const response = await ariaFetch("/api/auth/local-plan/", { method: "POST", body: JSON.stringify({ plan }) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? "Could not switch plans.");
  }
  await refreshAriaSession();
  window.dispatchEvent(new Event("aria:credits-updated"));
  window.dispatchEvent(new Event("aria:team-updated"));
}
