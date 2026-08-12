/** BNII ARIA brand tokens — keep apps in sync with these values. */
export const brand = {
  background: "#F0EEE6",
  foreground: "#141413",
  dark: "#141413",
  card: "#E8E4DC",
  accent: "#D88A68",
} as const;

export const webUrl =
  process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

/** @deprecated Single-app: workspace lives at /dashboard on the same origin */
export const workspaceUrl =
  process.env.NEXT_PUBLIC_WORKSPACE_URL ?? webUrl;
