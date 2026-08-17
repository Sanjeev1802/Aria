import { loadSettings, type SettingsData } from "@/lib/aria/settings";

export type ThemePreference = SettingsData["theme"];
export type ResolvedTheme = "light" | "dark";

export const THEME_EVENT = "aria-theme-change";

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

export function applyTheme(preference: ThemePreference) {
  if (typeof document === "undefined") return;

  const resolved = resolveTheme(preference);
  const root = document.documentElement;

  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolved;
}

export function applyStoredTheme() {
  applyTheme(loadSettings().theme);
}

export function setThemePreference(preference: ThemePreference) {
  applyTheme(preference);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(THEME_EVENT, { detail: { preference } }),
    );
  }
}
