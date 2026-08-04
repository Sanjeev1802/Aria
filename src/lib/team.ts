export type TeamRole = "admin" | "editor" | "viewer"

export type TeamMember = {
  id: string
  email: string
  role: TeamRole
  status: "pending" | "active"
  invitedAt: string
}

const STORAGE_KEY = "aria.team"

function storageKeyForUser(uid: string) {
  return `${STORAGE_KEY}.${uid}`
}

export function loadTeamMembers(uid: string): TeamMember[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKeyForUser(uid))
    if (!raw) return []
    const parsed = JSON.parse(raw) as TeamMember[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTeamMembers(uid: string, members: TeamMember[]) {
  localStorage.setItem(storageKeyForUser(uid), JSON.stringify(members))
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
}
