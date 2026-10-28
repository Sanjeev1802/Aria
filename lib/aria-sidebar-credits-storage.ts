import { ARIA_IS_PREVIEW, ariaFetch } from "@/lib/aria-session";

export type AriaSidebarCreditsSnapshot = {
  used: number;
  included: number;
  planLabel: string;
  reserved?: number;
  available?: number;
  period?: string;
  activity?: Record<string, number>;
};
let snapshot: AriaSidebarCreditsSnapshot = { used: 0, included: 0, planLabel: "Not connected" };
let activity: Record<string, number> = {};
export function loadAriaSidebarCredits() { return snapshot; }
export function loadServerTokenActivity() { return activity; }
export async function refreshAriaUsage(): Promise<AriaSidebarCreditsSnapshot> {
  if (ARIA_IS_PREVIEW) {
    snapshot = { used: 0, included: 0, planLabel: "Preview · no billing" };
    return snapshot;
  }
  try {
    const response = await ariaFetch("/api/usage/");
    if (response.status === 401) throw new Error("Signed out");
    if (!response.ok) throw new Error("Usage unavailable");
    const result = await response.json();
    activity = result.activity ?? {};
    snapshot = {
      used: result.used,
      included: result.included,
      reserved: result.reserved,
      available: result.available,
      planLabel: result.planLabel,
      period: result.period,
      activity,
    };
  } catch (error) {
    snapshot = { used: 0, included: 0, planLabel: (error as Error).message === "Signed out" ? "Signed out" : "Usage unavailable" };
    activity = {};
  }
  window.dispatchEvent(new Event("aria:token-activity-updated"));
  return snapshot;
}
