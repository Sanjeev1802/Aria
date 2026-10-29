"use client";

import { readAriaTheme, subscribeAriaTheme } from "@/lib/aria-theme";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const OPEN_CLASS = "aria-workspace-overlay-open";

export function AriaWorkspaceOverlay({
  children,
  label,
  onClose,
  className,
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const themeMode = useSyncExternalStore(subscribeAriaTheme, readAriaTheme, () => "dark" as const);

  useEffect(() => {
    setMounted(true);
    const frame = window.requestAnimationFrame(() => setOpen(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add(OPEN_CLASS);
    document.querySelector(".aria-openui-chat")?.classList.add(OPEN_CLASS);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove(OPEN_CLASS);
      document.querySelector(".aria-openui-chat")?.classList.remove(OPEN_CLASS);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn("aria-settings-modal-overlay", themeMode === "dark" && "dark", open && "is-open")}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={cn("aria-settings-modal-card t-modal", open && "is-open", className)}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="aria-settings-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={16} strokeWidth={1.75} aria-hidden />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
