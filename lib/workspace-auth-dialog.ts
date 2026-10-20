export type WorkspaceAuthIntent = "sign-in" | "sign-up";

export function workspaceAuthIntentFromDialog(title: string | null): WorkspaceAuthIntent | null {
  if (!title) return null;
  if (title === "Sign in to ARIA") return "sign-in";
  if (title.endsWith("— your next step")) return "sign-up";
  return null;
}
