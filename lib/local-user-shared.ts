export const LOCAL_USER_HEADER = "x-aria-local-user";
export const LOCAL_USER_COOKIE = "aria_local_user";
export const LOCAL_ACCOUNT_COOKIE = "aria_local_account";
export type LocalUserSlot = "alex" | "blair";

export function isLocalUserSlot(value: string | null | undefined): value is LocalUserSlot {
  return value === "alex" || value === "blair";
}

/** Loopback-only identities used for dev switching — not real customer accounts. */
export const LOCAL_DEV_FIXTURE_USER_IDS = new Set<string>(["local-alex", "local-blair"]);

export function isLocalDevFixtureUserId(userId: string) {
  return LOCAL_DEV_FIXTURE_USER_IDS.has(userId);
}
