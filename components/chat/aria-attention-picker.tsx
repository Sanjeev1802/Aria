"use client";

import {
  ARIA_ATTENTION,
  ARIA_ATTENTION_HINT,
  ARIA_ATTENTION_LEVELS,
  loadAriaAttention,
  setAriaAttention,
  type AriaAttentionId,
} from "@/lib/aria-attention";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

function closeDurationMs() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur");
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 150;
}

export function AriaAttentionPicker({ disabled }: { disabled?: boolean }) {
  const hintId = useId();
  const labelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>(0);
  const [attention, setAttention] = useState<AriaAttentionId>("glance");
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [menuPos, setMenuPos] = useState({ bottom: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAttention(loadAriaAttention());
    return () => window.clearTimeout(closeTimer.current);
  }, []);

  function placeMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 280;
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    setMenuPos({
      bottom: window.innerHeight - rect.top + 8,
      left,
    });
  }

  function openMenu() {
    if (disabled) return;
    window.clearTimeout(closeTimer.current);
    placeMenu();
    setClosing(false);
    setOpen(true);
  }

  function closeMenu() {
    if (!open) return;
    setOpen(false);
    setClosing(true);
    closeTimer.current = window.setTimeout(() => setClosing(false), closeDurationMs());
  }

  function pick(id: AriaAttentionId) {
    setAriaAttention(id);
    setAttention(id);
    closeMenu();
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        triggerRef.current?.focus();
      }
    };
    const onReposition = () => placeMenu();
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  const selected = ARIA_ATTENTION[attention];
  const menuVisible = open || closing;

  return (
    <div className="aria-attention">
      <button
        ref={triggerRef}
        type="button"
        className="aria-attention__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        title={ARIA_ATTENTION_HINT}
        onClick={() => (open ? closeMenu() : openMenu())}
      >
        <span id={labelId}>{selected.label}</span>
        <ChevronDown size={13} strokeWidth={2} aria-hidden />
      </button>
      <p id={hintId} className="sr-only">
        {ARIA_ATTENTION_HINT}
      </p>
      {mounted && menuVisible
        ? createPortal(
            <div
              ref={menuRef}
              className={`t-dropdown aria-attention-menu${open ? " is-open" : ""}${closing ? " is-closing" : ""}`}
              data-origin="bottom-left"
              style={{ bottom: menuPos.bottom, left: menuPos.left }}
              role="listbox"
              aria-label="Attention"
              aria-describedby={hintId}
            >
              <p className="aria-attention-menu__hint">{ARIA_ATTENTION_HINT}</p>
              {ARIA_ATTENTION_LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  role="option"
                  aria-selected={attention === level.id}
                  className="aria-attention-menu__opt"
                  onClick={() => pick(level.id)}
                >
                  <span className="aria-attention-menu__name">{level.label}</span>
                  <span className="aria-attention-menu__desc">{level.hint}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
