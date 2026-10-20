export type AriaProject = {
  id: string;
  name: string;
};

const STORAGE_KEY = "aria-sidebar-projects";

const defaultProjects: AriaProject[] = [];

export function loadAriaProjects(): AriaProject[] {
  if (typeof window === "undefined") return defaultProjects;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProjects;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultProjects;
    return parsed.filter(
      (p): p is AriaProject =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as AriaProject).id === "string" &&
        typeof (p as AriaProject).name === "string",
    );
  } catch {
    return defaultProjects;
  }
}

export function saveAriaProjects(projects: AriaProject[]): void {
  if (typeof window === "undefined") return;
  try {
    if (projects.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }
  } catch {
    // Storage blocked or quota exceeded.
  }
}

export function deleteAriaProject(projects: AriaProject[], projectId: string): AriaProject[] {
  return projects.filter((p) => p.id !== projectId);
}

export function createAriaProjectName(existing: AriaProject[], suggested?: string): string {
  const trimmed = suggested?.trim();
  if (trimmed) return trimmed;
  let n = existing.length + 1;
  let name = `Project ${n}`;
  const names = new Set(existing.map((p) => p.name.toLowerCase()));
  while (names.has(name.toLowerCase())) {
    n += 1;
    name = `Project ${n}`;
  }
  return name;
}
