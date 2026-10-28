/** v2: the console now opens dark, like the ARIA workspace. The old key stored "light" for everyone by default. */
const STORAGE_KEY = "aria-internal-color-scheme-v2";

export type InternalColorScheme = "light" | "dark";

export function readInternalColorScheme(): InternalColorScheme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light") return "light";
  return "dark";
}

export function applyInternalColorScheme(scheme: InternalColorScheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.internalTheme = scheme;
  window.localStorage.setItem(STORAGE_KEY, scheme);
}
