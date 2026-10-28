import type { AriaWorkspacePath } from "@/lib/aria-workspace-paths";

export type AriaSettingsModalSection =
  | "account"
  | "team"
  | "privacy"
  | "billing"
  | "usage"
  | "data";

export const SETTINGS_MODAL_PATHS: Record<AriaSettingsModalSection, AriaWorkspacePath> = {
  account: "settings",
  team: "settings",
  privacy: "settings",
  billing: "settings",
  usage: "settings",
  data: "settings",
};

export function pathToSettingsSection(path: string | undefined): AriaSettingsModalSection | null {
  switch (path) {
    case "settings":
      return "account";
    default:
      return null;
  }
}

/** Deep-link section when opening settings from menu (settings path defaults to account). */
export function initialSectionForPath(path: string | undefined): AriaSettingsModalSection {
  return pathToSettingsSection(path) ?? "account";
}
