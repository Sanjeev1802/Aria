"use client";

import { useEffect } from "react";
import { loadSettings } from "@/lib/aria/settings";
import {
  THEME_EVENT,
  applyTheme,
  type ThemePreference,
} from "@/lib/aria/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(loadSettings().theme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (loadSettings().theme === "system") {
        applyTheme("system");
      }
    };

    media.addEventListener("change", onSystemChange);

    const onStorage = (event: StorageEvent) => {
      if (event.key === "aria.workspace.settings.v1") {
        applyTheme(loadSettings().theme);
      }
    };
    window.addEventListener("storage", onStorage);

    const onThemeEvent = (event: Event) => {
      const preference = (event as CustomEvent<{ preference?: ThemePreference }>)
        .detail?.preference;
      applyTheme(preference ?? loadSettings().theme);
    };
    window.addEventListener(THEME_EVENT, onThemeEvent);

    // Re-apply after hydration in case React reset html className.
    const frame = window.requestAnimationFrame(() => {
      applyTheme(loadSettings().theme);
    });

    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(THEME_EVENT, onThemeEvent);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return children;
}
