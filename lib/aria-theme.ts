"use client";

export const ARIA_THEME_STORAGE_KEY = "aria-theme-mode";
export const ARIA_THEME_EVENT = "aria:theme-change";
export const ARIA_THEME_ATTRIBUTE = "data-aria-theme";

export type AriaThemeMode = "light" | "dark";

export function parseAriaTheme(value: unknown): AriaThemeMode {
  return value === "light" ? "light" : "dark";
}

export function readAriaTheme(): AriaThemeMode {
  if (typeof document !== "undefined") {
    return parseAriaTheme(document.documentElement.getAttribute(ARIA_THEME_ATTRIBUTE));
  }
  if (typeof window === "undefined") return "dark";
  try {
    return parseAriaTheme(window.localStorage.getItem(ARIA_THEME_STORAGE_KEY));
  } catch {
    return "dark";
  }
}

export function applyAriaTheme(mode: AriaThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute(ARIA_THEME_ATTRIBUTE, mode);
  root.style.colorScheme = mode;
  try {
    window.localStorage.setItem(ARIA_THEME_STORAGE_KEY, mode);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(ARIA_THEME_EVENT));
}

export function subscribeAriaTheme(onChange: () => void) {
  window.addEventListener(ARIA_THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ARIA_THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
