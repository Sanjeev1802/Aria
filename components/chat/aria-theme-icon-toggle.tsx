"use client";

import {
  applyAriaTheme,
  readAriaTheme,
  subscribeAriaTheme,
  type AriaThemeMode,
} from "@/lib/aria-theme";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

export function AriaThemeIconToggle() {
  const theme = useSyncExternalStore(subscribeAriaTheme, readAriaTheme, (): AriaThemeMode => "dark");
  const next: AriaThemeMode = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="aria-theme-icon-toggle"
      aria-label={`Switch to ${next} mode`}
      title={next === "light" ? "Light" : "Dark"}
      onClick={() => applyAriaTheme(next)}
    >
      <span className="t-icon-swap" data-state={theme === "light" ? "a" : "b"} aria-hidden>
        <span className="t-icon" data-icon="a">
          <Sun size={16} strokeWidth={1.75} />
        </span>
        <span className="t-icon" data-icon="b">
          <Moon size={16} strokeWidth={1.75} />
        </span>
      </span>
    </button>
  );
}
