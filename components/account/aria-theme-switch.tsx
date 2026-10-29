"use client";

import { applyAriaTheme, type AriaThemeMode } from "@/lib/aria-theme";
import { Moon, Sun } from "lucide-react";
import { useLayoutEffect, useRef } from "react";

const OPTIONS: { id: AriaThemeMode; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
];

function movePill(bar: HTMLElement, pill: HTMLElement, tab: HTMLElement, animate: boolean) {
  const prev = pill.style.transition;
  if (!animate) pill.style.transition = "none";
  pill.style.transform = `translateX(${tab.offsetLeft}px)`;
  pill.style.width = `${tab.offsetWidth}px`;
  if (!animate) {
    void pill.offsetWidth;
    pill.style.transition = prev;
  }
}

export function AriaThemeSwitch({
  value,
  onChange,
}: {
  value: AriaThemeMode;
  onChange?: (next: AriaThemeMode) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const firstPaint = useRef(true);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    const active = bar.querySelector<HTMLElement>('[aria-selected="true"]');
    if (active) movePill(bar, pill, active, !firstPaint.current);
    firstPaint.current = false;

    const onResize = () => {
      const next = bar.querySelector<HTMLElement>('[aria-selected="true"]');
      if (next) movePill(bar, pill, next, false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [value]);

  const select = (next: AriaThemeMode) => {
    if (next === value) return;
    applyAriaTheme(next);
    onChange?.(next);
  };

  return (
    <div
      ref={barRef}
      className="t-tabs aria-theme-switch"
      role="tablist"
      aria-label="Appearance"
    >
      <span ref={pillRef} className="t-tabs-pill aria-theme-switch__pill" aria-hidden="true" />
      {OPTIONS.map(({ id, label, Icon }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            className="t-tab aria-theme-switch__option"
            data-theme-option={id}
            aria-selected={selected}
            onClick={() => select(id)}
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
