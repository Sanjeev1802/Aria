import { ARIA_PREVIEW_PROFILE } from "@/lib/aria-profile-user";

const STORAGE_KEY = "aria-team-workspace";

/** Seats bundled with the Team plan (see pricing). */
export const ARIA_TEAM_INCLUDED_SEATS = 5;

export type AriaTeamMemberRole = "admin" | "member";

export type AriaTeamMember = {
  id: string;
  name: string;
  email: string;
  role: AriaTeamMemberRole;
  status: "active" | "pending";
};

export type AriaTeamWorkspace = {
  name: string;
  members: AriaTeamMember[];
};

function defaultWorkspace(): AriaTeamWorkspace {
  return {
    name: "Studio workspace",
    members: [
      {
        id: "self",
        name: ARIA_PREVIEW_PROFILE.name,
        email: ARIA_PREVIEW_PROFILE.email,
        role: "admin",
        status: "active",
      },
      {
        id: "jamie",
        name: "Jamie Lee",
        email: "jamie.lee@example.com",
        role: "admin",
        status: "active",
      },
      {
        id: "sam",
        name: "Sam Kim",
        email: "sam.kim@example.com",
        role: "member",
        status: "active",
      },
    ],
  };
}

export function loadAriaTeamWorkspace(): AriaTeamWorkspace {
  if (typeof window === "undefined") {
    return defaultWorkspace();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultWorkspace();
    const parsed = JSON.parse(raw) as AriaTeamWorkspace;
    if (!parsed?.members?.length) return defaultWorkspace();
    return parsed;
  } catch {
    return defaultWorkspace();
  }
}

export function saveAriaTeamWorkspace(workspace: AriaTeamWorkspace): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    window.dispatchEvent(new Event("aria:team-updated"));
  } catch {
    // ignore
  }
}

export function countAriaTeamSeatsUsed(members: AriaTeamMember[]): number {
  return members.filter((m) => m.status === "active" || m.status === "pending").length;
}

export function inviteAriaTeamMember(email: string): AriaTeamWorkspace {
  const workspace = loadAriaTeamWorkspace();
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    return workspace;
  }
  if (workspace.members.some((m) => m.email.toLowerCase() === normalized)) {
    return workspace;
  }
  if (countAriaTeamSeatsUsed(workspace.members) >= ARIA_TEAM_INCLUDED_SEATS) {
    return workspace;
  }
  const localPart = normalized.split("@")[0] ?? "teammate";
  const displayName = localPart
    .split(/[._-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const next: AriaTeamWorkspace = {
    ...workspace,
    members: [
      ...workspace.members,
      {
        id: `invite-${Date.now()}`,
        name: displayName,
        email: normalized,
        role: "member",
        status: "pending",
      },
    ],
  };
  saveAriaTeamWorkspace(next);
  return next;
}

export function removeAriaTeamMember(memberId: string): AriaTeamWorkspace {
  const workspace = loadAriaTeamWorkspace();
  if (memberId === "self") return workspace;
  const next = {
    ...workspace,
    members: workspace.members.filter((m) => m.id !== memberId),
  };
  saveAriaTeamWorkspace(next);
  return next;
}
