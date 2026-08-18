"use client";

import { useEffect, useRef, useState } from "react";
import { resourceDropdownItems } from "@/lib/data/resources";

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ResourcesDropdownProps = {
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
};

export default function ResourcesDropdown({
  onNavigate,
  variant = "desktop",
}: ResourcesDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "desktop") return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [variant]);

  function handleLinkClick() {
    setOpen(false);
    onNavigate?.();
  }

  if (variant === "mobile") {
    return (
      <div className="w-full">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          Resources
          <ChevronDownIcon
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <ul className="mt-1 space-y-1 pl-3">
            {resourceDropdownItems.map((item) => (
              <li key={item.slug}>
                <a
                  href={item.href}
                  className="block rounded-lg px-3 py-2.5 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
                  onClick={handleLinkClick}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-foreground/80 transition-colors hover:text-foreground"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Resources
        <ChevronDownIcon
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-3 w-[min(12rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-foreground/10 bg-background p-2 shadow-lg shadow-foreground/5">
          <ul>
            {resourceDropdownItems.map((item) => (
              <li key={item.slug}>
                <a
                  href={item.href}
                  className="block rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                  onClick={handleLinkClick}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
