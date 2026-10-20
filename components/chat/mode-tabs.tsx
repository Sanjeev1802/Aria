"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ChatMode } from "@/lib/chat-preview";

type Props = {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
};

/** transitions.dev 16-tabs-sliding */
export function ModeTabs({ mode, onChange }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  const moveTo = useCallback((tab: HTMLButtonElement, animate: boolean) => {
    const pill = pillRef.current;
    if (!pill) return;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
    }
  }, []);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const tabs = [...bar.querySelectorAll<HTMLButtonElement>(".t-tab")];
    tabs.forEach((t) => {
      const selected = t.dataset.mode === mode;
      t.setAttribute("aria-selected", selected ? "true" : "false");
    });
    const active = tabs.find((t) => t.getAttribute("aria-selected") === "true") ?? tabs[0];
    if (active) requestAnimationFrame(() => moveTo(active, false));

    const onResize = () => {
      const current = tabs.find((t) => t.getAttribute("aria-selected") === "true") ?? tabs[0];
      if (current) moveTo(current, false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mode, moveTo]);

  function select(next: ChatMode, tab: HTMLButtonElement) {
    onChange(next);
    const bar = barRef.current;
    if (!bar) return;
    bar.querySelectorAll(".t-tab").forEach((t) => {
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    moveTo(tab, true);
  }

  return (
    <div className="t-tabs" role="tablist" aria-label="Answer mode" ref={barRef}>
      <span className="t-tabs-pill" aria-hidden ref={pillRef} />
      <button
        type="button"
        className="t-tab"
        role="tab"
        data-mode="general"
        aria-selected={mode === "general"}
        onClick={(e) => select("general", e.currentTarget)}
      >
        General
      </button>
      <button
        type="button"
        className="t-tab"
        role="tab"
        data-mode="intelligence"
        aria-selected={mode === "intelligence"}
        onClick={(e) => select("intelligence", e.currentTarget)}
      >
        Intelligence
      </button>
    </div>
  );
}
