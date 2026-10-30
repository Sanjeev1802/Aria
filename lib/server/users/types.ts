/** Platform-wide role stored in Aurora (or local SQLite mirror). Workspace membership roles stay separate. */
export type GlobalUserRole = "super_admin" | "admin" | "member" | "team_admin" | "team_member";

export const GLOBAL_USER_ROLES: readonly GlobalUserRole[] = [
  "super_admin",
  "admin",
  "member",
  "team_admin",
  "team_member",
] as const;

export function isGlobalUserRole(value: unknown): value is GlobalUserRole {
  return typeof value === "string" && (GLOBAL_USER_ROLES as readonly string[]).includes(value);
}

/** Default role for every new Cognito sign-up. */
export const DEFAULT_SIGNUP_ROLE: GlobalUserRole = "member";

/** Roles allowed to send Team workspace invitations. */
export function canInviteTeamMembers(role: GlobalUserRole | undefined) {
  return role === "team_admin" || role === "super_admin" || role === "admin";
}
