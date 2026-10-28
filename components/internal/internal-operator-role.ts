export type InternalRole = "super_admin" | "support" | "billing" | "operations";

export const PRD_INTERNAL_ROLE_MATRIX: {
  label: string;
  roles: Record<InternalRole, boolean>;
}[] = [
  {
    label: "Inspect customers and workspaces",
    roles: { super_admin: true, support: true, billing: true, operations: true },
  },
  {
    label: "Change plans and grant credits",
    roles: { super_admin: true, support: false, billing: true, operations: false },
  },
  {
    label: "Disable accounts and revoke sessions (restore access: super admin only)",
    roles: { super_admin: true, support: false, billing: false, operations: true },
  },
];

export function internalRoleLabel(role: InternalRole): string {
  switch (role) {
    case "super_admin":
      return "Super admin";
    case "operations":
      return "Operations";
    case "billing":
      return "Billing";
    case "support":
      return "Support";
  }
}

export function internalRoleCapabilities(role: InternalRole) {
  const row = (index: number) => PRD_INTERNAL_ROLE_MATRIX[index]?.roles[role] ?? false;
  return {
    inspect: row(0),
    plansAndCredits: row(1),
    accountControls: row(2),
  };
}
