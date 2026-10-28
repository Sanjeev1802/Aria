const STORAGE_KEY = "aria-internal-color-scheme";

export type InternalColorScheme = "light" | "dark";

export function readInternalColorScheme(): InternalColorScheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark") return "dark";
  return "light";
}

export function applyInternalColorScheme(scheme: InternalColorScheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.internalTheme = scheme;
  window.localStorage.setItem(STORAGE_KEY, scheme);
}
