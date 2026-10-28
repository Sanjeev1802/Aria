/**
 * ARIA Team roles. Super admin is set on the server. An admin can see everything and can change
 * everything once a super admin grants edit access. A member is view-only. Billing and Operations
 * are scoped to those jobs. `support` is the older name for a view-only member.
 */
export type InternalRole = "super_admin" | "admin" | "member" | "support" | "billing" | "operations";

/** The roles shown in the team UI; `support` is folded into `member`. */
export type TeamRole = "super_admin" | "admin" | "member" | "billing" | "operations";
export const TEAM_ROLES: TeamRole[] = ["super_admin", "admin", "member", "billing", "operations"];
/** Roles a super admin can hand out from the ARIA Team page. */
export const GRANTABLE_TEAM_ROLES: Exclude<TeamRole, "super_admin">[] = ["admin", "member", "billing", "operations"];

export const teamRoleOf = (role: InternalRole): TeamRole => (role === "support" ? "member" : role);

/** `granted` means the role can do it once a super admin turns on edit access. */
export type RoleCell = boolean | "granted";

export const PRD_INTERNAL_ROLE_MATRIX: {
  label: string;
  roles: Record<TeamRole, RoleCell>;
}[] = [
  {
    label: "Inspect customers, workspaces and usage",
    roles: { super_admin: true, admin: true, member: true, billing: true, operations: true },
  },
  {
    label: "Change plans and grant credits",
    roles: { super_admin: true, admin: "granted", member: false, billing: true, operations: false },
  },
  {
    label: "Suspend or restore ARIA AI and revoke sessions (restoring needs full edit access)",
    roles: { super_admin: true, admin: "granted", member: false, billing: false, operations: true },
  },
  {
    label: "Edit subscription plans and pricing",
    roles: { super_admin: true, admin: "granted", member: false, billing: false, operations: false },
  },
  {
    label: "Manage the ARIA Team",
    roles: { super_admin: true, admin: false, member: false, billing: false, operations: false },
  },
];

export function internalRoleLabel(role: InternalRole): string {
  switch (role) {
    case "super_admin":
      return "Super admin";
    case "admin":
      return "Admin";
    case "member":
      return "Member";
    case "operations":
      return "Operations";
    case "billing":
      return "Billing";
    case "support":
      return "Support";
  }
}

/** One-line description used wherever a role is picked or explained. */
export function internalRoleSummary(role: TeamRole): string {
  switch (role) {
    case "super_admin":
      return "Everything, including who is on the team. Set on the server.";
    case "admin":
      return "Sees everything. Can change anything once a super admin turns on edit access.";
    case "member":
      return "Can look around the console but cannot change anything.";
    case "billing":
      return "Can change plans and grant small credit adjustments.";
    case "operations":
      return "Can suspend AI access and revoke sessions.";
  }
}

/** Full edit access: super admins always, admins only when a super admin granted it. */
export const hasFullAccess = (role: InternalRole, canEdit: boolean) => role === "super_admin" || (role === "admin" && canEdit);

export function internalRoleCapabilities(role: InternalRole, canEdit = false) {
  const full = hasFullAccess(role, canEdit);
  return {
    inspect: true,
    plansAndCredits: full || role === "billing",
    accountControls: full || role === "operations",
    subscriptionEditing: full,
    manageTeam: role === "super_admin",
  };
}
