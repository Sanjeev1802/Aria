/** POST /api/admin/actions/ — server fills the audit reason for this source. */
export const INTERNAL_AUDIT_SOURCE_AI_ACCESS = "ai_access_toggle" as const;

export type InternalAuditSource = typeof INTERNAL_AUDIT_SOURCE_AI_ACCESS;

const AI_ACCESS_REASON = {
  disable_user:
    "Suspended ARIA AI for this customer. Sign-in and the pricing page stay available; chat and other AI features are blocked until access is restored.",
  enable_user:
    "Restored ARIA AI for this customer on their current subscription plan.",
} as const;

/** Human-readable audit titles for Internal console (not raw action enum names). */
export const INTERNAL_AUDIT_ACTION_LABEL: Record<string, string> = {
  disable_user: "ARIA AI suspended",
  enable_user: "ARIA AI restored",
  revoke_sessions: "Sessions revoked",
  set_plan: "Plan changed",
  grant_credits: "Credits granted",
  grant_operator: "Operator access granted",
  revoke_operator: "Operator access removed",
};

export function internalAuditReasonForSource(
  type: "disable_user" | "enable_user",
  source: string | undefined,
): string | undefined {
  if (source !== INTERNAL_AUDIT_SOURCE_AI_ACCESS) return undefined;
  return AI_ACCESS_REASON[type];
}

/** Map older client-written reasons to current ARIA copy for display only. */
export function normalizeInternalAuditReason(reason: string): string {
  const trimmed = reason.trim();
  const legacy: Record<string, string> = {
    "Customer account disabled from Internal console account access toggle.":
      AI_ACCESS_REASON.disable_user,
    "Customer account enabled from Internal console account access toggle.":
      AI_ACCESS_REASON.enable_user,
    "ARIA AI access suspended from Internal console product access toggle.":
      AI_ACCESS_REASON.disable_user,
    "ARIA AI access restored from Internal console product access toggle.":
      AI_ACCESS_REASON.enable_user,
  };
  return legacy[trimmed] ?? trimmed;
}

export function internalAuditActionLabel(action: string): string {
  return INTERNAL_AUDIT_ACTION_LABEL[action] ?? action.replaceAll("_", " ");
}
