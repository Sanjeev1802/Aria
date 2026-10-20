/** In-app workspace routes (sidebar + main panel, composer hidden). */
export const ARIA_WORKSPACE_PATHS = ["library", "pricing", "settings", "help"] as const;

export type AriaWorkspacePath = (typeof ARIA_WORKSPACE_PATHS)[number];

export function isAriaWorkspacePath(path: string | undefined): path is AriaWorkspacePath {
  return ARIA_WORKSPACE_PATHS.includes(path as AriaWorkspacePath);
}
