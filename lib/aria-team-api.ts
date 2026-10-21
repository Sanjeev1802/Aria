import { ariaFetch, type AriaRole } from "@/lib/aria-session";

export type AriaTeamApiMember = {
  id: string; name: string; email: string; role: AriaRole; status: "active" | "pending" | "expired"; expiresAt?: number;
  budget?: { period: string; limit: number | null; used: number; reserved: number };
};
export type AriaTeamApiWorkspace = {
  name: string; seatLimit: number; seatsUsed: number; selfId: string; role: AriaRole; members: AriaTeamApiMember[];
};

async function failure(response: Response) {
  const body = await response.json().catch(() => ({}));
  return new Error(body.message ?? "The team could not be updated. Try again.");
}

export async function fetchAriaTeam(): Promise<AriaTeamApiWorkspace> {
  const response = await ariaFetch("/api/workspace/members/");
  if (!response.ok) throw await failure(response);
  const body = await response.json();
  return { name: body.workspace.name, seatLimit: body.workspace.seatLimit, seatsUsed: body.workspace.seatsUsed,
    selfId: body.selfId, role: body.role, members: body.members };
}

/** Email delivery when configured; local development can return a one-time link. */
export async function inviteAriaTeamMemberApi(email: string): Promise<{ delivery: "email" | "link"; inviteUrl?: string }> {
  const response = await ariaFetch("/api/workspace/members/", { method: "POST", body: JSON.stringify({ email }) });
  if (!response.ok) throw await failure(response);
  return await response.json();
}

export async function removeAriaTeamMemberApi(id: string) {
  const response = await ariaFetch("/api/workspace/members/", { method: "DELETE", body: JSON.stringify({ id }) });
  if (!response.ok) throw await failure(response);
}

export async function setAriaTeamMemberLimitApi(id: string, limit: number | null) {
  const response = await ariaFetch("/api/workspace/members/", { method: "PATCH", body: JSON.stringify({ id, limit }) });
  if (!response.ok) throw await failure(response);
  return await response.json();
}

export async function acceptAriaInvite(token: string) {
  const response = await ariaFetch("/api/workspace/invitations/accept/", { method: "POST", body: JSON.stringify({ token }) });
  if (!response.ok) throw await failure(response);
}
