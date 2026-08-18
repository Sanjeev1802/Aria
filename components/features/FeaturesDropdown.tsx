"use client";

import { useEffect, useRef, useState } from "react";
import { featureDropdownItems } from "@/lib/data/features";

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

type FeaturesDropdownProps = {
  basePath?: string;
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
};

export default function FeaturesDropdown({
  basePath = "",
  onNavigate,
  variant = "desktop",
}: FeaturesDropdownProps) {
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

  const featuresHref = `${basePath}/features`;
  const overviewHref = `${basePath}/features#features`;

  if (variant === "mobile") {
    return (
      <div className="w-full">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          Features
          <ChevronDownIcon
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <ul className="mt-1 space-y-1 pl-3">
            {featureDropdownItems.map((item) => (
              <li key={item.slug}>
                <a
                  href={`${basePath}/features#${item.slug}`}
                  className="block rounded-lg px-3 py-2.5 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
                  onClick={handleLinkClick}
                >
                  {item.title}
                </a>
              </li>
            ))}
            <li>
              <a
                href={overviewHref}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                onClick={handleLinkClick}
              >
                View all features
              </a>
            </li>
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
        Features
        <ChevronDownIcon
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-3 w-[min(14rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-foreground/10 bg-background p-2 shadow-lg shadow-foreground/5">
          <ul>
            {featureDropdownItems.map((item) => (
              <li key={item.slug}>
                <a
                  href={`${basePath}/features#${item.slug}`}
                  className="block rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                  onClick={handleLinkClick}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t border-foreground/10 pt-1">
            <a
              href={featuresHref}
              className="block rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
              onClick={handleLinkClick}
            >
              View all features
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
