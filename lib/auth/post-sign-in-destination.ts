import type { AriaGlobalRole, AriaSession } from "@/lib/aria-session";
import { safeNextPath } from "@/lib/auth/safe-next-path";

type PostSignInSession = {
  operator?: AriaSession["operator"];
  user?: { globalRole?: AriaGlobalRole };
};

/** Only platform super admins and admins use the Internal console UI. */
export function hasInternalProductAccess(session: PostSignInSession) {
  const global = session.user?.globalRole;
  if (global === "super_admin" || global === "admin") return true;
  const internal = session.operator?.role;
  return internal === "super_admin" || internal === "admin";
}

/** After sign-in, operators open Internal; everyone else opens the customer app. */
export function resolvePostSignInPath(session: PostSignInSession, nextFromQuery?: string | null) {
  const next = safeNextPath(nextFromQuery, "/chat/");
  if (hasInternalProductAccess(session)) {
    if (next.startsWith("/internal")) return next;
    return "/internal/";
  }
  if (next.startsWith("/internal")) return "/chat/";
  return next;
}

export function isInternalGlobalRole(role: AriaGlobalRole | undefined) {
  return role === "super_admin" || role === "admin";
}
