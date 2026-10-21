import { ServiceError } from "../errors";

export type PlanId = "free" | "pro" | "team";
export type ModelChoice = "nova";
export type Role = "owner" | "admin" | "member";

export type Entitlement = {
  id: PlanId;
  label: string;
  /** Integer millicredits granted per monthly period (1,000 = 1 credit). */
  monthlyUnits: number;
  seats: number;
  models: readonly ModelChoice[];
  apiAccess: boolean;
  teamManagement: boolean;
};

/** Server-owned plan rules. Browser plan labels are display only. */
export const PLANS: Record<PlanId, Entitlement> = {
  free: { id: "free", label: "Free", monthlyUnits: 200_000, seats: 1, models: ["nova"], apiAccess: false, teamManagement: false },
  pro: { id: "pro", label: "Pro", monthlyUnits: 6_000_000, seats: 1, models: ["nova"], apiAccess: true, teamManagement: false },
  team: { id: "team", label: "Team", monthlyUnits: 20_000_000, seats: 5, models: ["nova"], apiAccess: true, teamManagement: true },
};

export function isPlanId(value: unknown): value is PlanId {
  return value === "free" || value === "pro" || value === "team";
}

export function entitlementFor(plan: unknown): Entitlement {
  if (!isPlanId(plan)) throw new ServiceError("workspace_plan_invalid", 500);
  return PLANS[plan];
}

export type Permission =
  | "chat" | "usage:read" | "members:read"
  | "members:invite" | "members:remove" | "billing:manage";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: ["chat", "usage:read", "members:read", "members:invite", "members:remove", "billing:manage"],
  admin: ["chat", "usage:read", "members:read", "members:invite", "members:remove"],
  member: ["chat", "usage:read", "members:read"],
};

export function isRole(value: unknown): value is Role {
  return value === "owner" || value === "admin" || value === "member";
}

export function can(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requirePermission(role: Role, permission: Permission) {
  if (!can(role, permission)) throw new ServiceError("permission_denied", 403);
}

export function requireModel(plan: Entitlement, model: ModelChoice) {
  if (!plan.models.includes(model)) throw new ServiceError("model_not_in_plan", 403);
}

/** Calendar-month billing period in UTC, e.g. "2026-10". */
export function periodFor(now: number) {
  return new Date(now).toISOString().slice(0, 7);
}
