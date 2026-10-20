export const LOCAL_USER_HEADER = "x-aria-local-user";
export const LOCAL_USER_COOKIE = "aria_local_user";
export const LOCAL_ACCOUNT_COOKIE = "aria_local_account";
export type LocalUserSlot = "alex" | "blair";

export function isLocalUserSlot(value: string | null | undefined): value is LocalUserSlot {
  return value === "alex" || value === "blair";
}
