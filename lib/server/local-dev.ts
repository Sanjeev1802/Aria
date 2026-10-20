import type { Identity } from "./accounts/directory";
import { LOCAL_USER_COOKIE, LOCAL_USER_HEADER, isLocalUserSlot, type LocalUserSlot } from "@/lib/local-user-shared";

export { LOCAL_USER_COOKIE, LOCAL_USER_HEADER, isLocalUserSlot, type LocalUserSlot };

const USERS: Record<LocalUserSlot, Identity> = {
  alex: {
    sub: "local-alex",
    email: "alex@localhost.test",
    emailVerified: true,
    name: "Alex Local",
    authTime: Number.MAX_SAFE_INTEGER,
  },
  blair: {
    sub: "local-blair",
    email: "blair@localhost.test",
    emailVerified: true,
    name: "Blair Local",
    authTime: Number.MAX_SAFE_INTEGER,
  },
};

export const LOCAL_DEV_USER_LABELS: { slot: LocalUserSlot; label: string }[] = [
  { slot: "alex", label: "Alex Local" },
  { slot: "blair", label: "Blair Local" },
];

function readCookie(header: string | null, name: string) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** Resolves the active loopback development identity from header or cookie. */
export function resolveLocalUser(request: Request): { slot: LocalUserSlot; identity: Identity } {
  const header = request.headers.get(LOCAL_USER_HEADER);
  const cookie = readCookie(request.headers.get("cookie"), LOCAL_USER_COOKIE);
  const slot = isLocalUserSlot(header) ? header : isLocalUserSlot(cookie) ? cookie : "alex";
  return { slot, identity: USERS[slot] };
}
