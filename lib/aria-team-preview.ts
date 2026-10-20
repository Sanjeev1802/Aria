import {
  ARIA_TEAM_INCLUDED_SEATS,
  countAriaTeamSeatsUsed,
  loadAriaTeamWorkspace,
  type AriaTeamMember,
} from "@/lib/aria-team-storage";
import type { AriaTeamApiWorkspace } from "@/lib/aria-team-api";

/** Design-preview team data only. Live mode must use the server API. */
export function previewTeamWorkspace(): AriaTeamApiWorkspace {
  const local = loadAriaTeamWorkspace();
  return {
    name: local.name,
    seatLimit: ARIA_TEAM_INCLUDED_SEATS,
    seatsUsed: countAriaTeamSeatsUsed(local.members),
    selfId: "self",
    role: "owner",
    members: local.members.map((m: AriaTeamMember) => ({ ...m, role: m.id === "self" ? "owner" : m.role })),
  };
}
