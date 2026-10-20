import { LOCAL_USER_COOKIE, type LocalUserSlot } from "@/lib/local-user-shared";

export type { LocalUserSlot };

export function readLocalUserSlot(): LocalUserSlot | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCAL_USER_COOKIE}=([^;]*)`));
  const value = match?.[1];
  return value === "blair" ? "blair" : value === "alex" ? "alex" : undefined;
}

export async function selectLocalUser(slot: LocalUserSlot) {
  const response = await fetch("/api/auth/local-user/", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Aria-Local-User": slot },
    body: JSON.stringify({ user: slot }),
  });
  if (!response.ok) throw new Error("local_user_switch_failed");
}
