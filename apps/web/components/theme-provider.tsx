"use client";

import { useEffect } from "react";
import { loadSettings } from "@/lib/aria/settings";
import { applyTheme } from "@/lib/aria/theme";

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

    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return children;
}
