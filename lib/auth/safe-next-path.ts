/** Same-origin path from `?next=`, never an external URL. */
export function safeNextPath(value: string | null | undefined, fallback = "/chat/"): string {
  const next = value ?? "";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export function signInHref(next = "/chat/"): string {
  return `/sign-in/?next=${encodeURIComponent(safeNextPath(next))}`;
}
