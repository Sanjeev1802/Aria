export type WorkspaceRole = "admin" | "user";

export type WorkspaceUser = {
  id: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  status: "active" | "invited";
  createdAt: number;
  updatedAt: number;
};

const USERS_KEY = "aria.workspace.users.v1";

function createId() {
  return `usr_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function loadWorkspaceUsers(): WorkspaceUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkspaceUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWorkspaceUsers(users: WorkspaceUser[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** Ensure the signed-in account exists in the roster. First account becomes admin. */
export function ensureWorkspaceUser(
  email: string,
  name?: string | null,
): WorkspaceUser {
  const normalized = email.trim().toLowerCase();
  const users = loadWorkspaceUsers();
  const existing = users.find((u) => u.email === normalized);
  if (existing) {
    if (name && name !== existing.name) {
      const next = users.map((u) =>
        u.id === existing.id
          ? { ...u, name, updatedAt: Date.now(), status: "active" as const }
          : u,
      );
      saveWorkspaceUsers(next);
      return next.find((u) => u.id === existing.id)!;
    }
    if (existing.status !== "active") {
      const next = users.map((u) =>
        u.id === existing.id
          ? { ...u, status: "active" as const, updatedAt: Date.now() }
          : u,
      );
      saveWorkspaceUsers(next);
      return next.find((u) => u.id === existing.id)!;
    }
    return existing;
  }

  const now = Date.now();
  const created: WorkspaceUser = {
    id: createId(),
    email: normalized,
    name: name?.trim() || normalized.split("@")[0] || "User",
    role: users.length === 0 ? "admin" : "user",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  saveWorkspaceUsers([created, ...users]);
  return created;
}

export function getWorkspaceUserByEmail(
  email: string | null | undefined,
): WorkspaceUser | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return (
    loadWorkspaceUsers().find((u) => u.email === normalized) ?? null
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return getWorkspaceUserByEmail(email)?.role === "admin";
}

export function addWorkspaceUser(input: {
  email: string;
  name: string;
  role: WorkspaceRole;
}): { user?: WorkspaceUser; error?: string } {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (!name) {
    return { error: "Enter a display name." };
  }

  const users = loadWorkspaceUsers();
  if (users.some((u) => u.email === email)) {
    return { error: "A user with this email already exists." };
  }

  const now = Date.now();
  const user: WorkspaceUser = {
    id: createId(),
    email,
    name,
    role: input.role,
    status: "invited",
    createdAt: now,
    updatedAt: now,
  };
  saveWorkspaceUsers([user, ...users]);
  return { user };
}

export function updateWorkspaceUserRole(
  id: string,
  role: WorkspaceRole,
  actorEmail: string,
): { error?: string } {
  const users = loadWorkspaceUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return { error: "User not found." };

  if (target.email === actorEmail.trim().toLowerCase() && role !== "admin") {
    const adminCount = users.filter((u) => u.role === "admin").length;
    if (adminCount <= 1) {
      return { error: "You can’t remove the last admin." };
    }
  }

  if (target.role === "admin" && role === "user") {
    const adminCount = users.filter((u) => u.role === "admin").length;
    if (adminCount <= 1) {
      return { error: "At least one admin is required." };
    }
  }

  saveWorkspaceUsers(
    users.map((u) =>
      u.id === id ? { ...u, role, updatedAt: Date.now() } : u,
    ),
  );
  return {};
}

export function removeWorkspaceUser(
  id: string,
  actorEmail: string,
): { error?: string } {
  const users = loadWorkspaceUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return { error: "User not found." };

  if (target.email === actorEmail.trim().toLowerCase()) {
    return { error: "You can’t remove your own account here." };
  }

  if (target.role === "admin") {
    const adminCount = users.filter((u) => u.role === "admin").length;
    if (adminCount <= 1) {
      return { error: "At least one admin is required." };
    }
  }

  saveWorkspaceUsers(users.filter((u) => u.id !== id));
  return {};
}
