"use client";

import { useEffect, useState } from "react";
import FeaturesDropdown from "@/components/features/FeaturesDropdown";
import ResourcesDropdown from "@/components/resources/ResourcesDropdown";

const navLinks = [{ label: "Pricing", href: "/pricing" }];

function AuthNavLink({
  className = "",
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href="/sign-in"
      onClick={onClick}
      className={`whitespace-nowrap text-sm text-foreground/80 transition-colors hover:text-foreground ${className}`}
    >
      Sign in
    </a>
  );
}

function TryAriaButton({
  compact = false,
  onClick,
}: {
  compact?: boolean;
  onClick?: () => void;
}) {
  return (
    <a
      href="/contact"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-black font-medium text-white transition-opacity hover:opacity-90 ${
        compact ? "px-3.5 py-2 text-xs" : "px-4 py-2.5 text-sm sm:px-5"
      }`}
    >
      TRY ARIA
    </a>
  );
}

function MenuIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7H20M4 12H20M4 17H20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("menu-open", mobileOpen);
    return () => document.body.classList.remove("menu-open");
  }, [mobileOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function closeMenu() {
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/90">
      <div className="page-container flex items-center justify-between gap-3 py-4 sm:gap-4 sm:py-5">
        <a
          href="/"
          className="min-w-0 shrink text-base font-semibold tracking-tight text-foreground sm:text-lg md:text-xl"
        >
          BNII ARIA
        </a>

        <nav
          className="hidden items-center justify-center gap-5 lg:flex xl:gap-8"
          aria-label="Main navigation"
        >
          <FeaturesDropdown />
          <ResourcesDropdown />
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="whitespace-nowrap text-sm text-foreground/80 transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Desktop CTAs only — avoid duplicating with hamburger on tablet */}
          <div className="hidden items-center gap-3 lg:flex xl:gap-4">
            <AuthNavLink />
            <TryAriaButton />
          </div>

          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/5 lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
            style={{ top: "var(--header-height, 4.25rem)" }}
            aria-label="Close menu overlay"
            onClick={closeMenu}
          />
          <nav
            id="mobile-nav"
            className="relative z-50 max-h-[calc(100dvh-4.25rem)] overflow-y-auto border-t border-foreground/10 bg-background px-5 pb-6 pt-4 sm:px-8 lg:hidden"
            aria-label="Mobile navigation"
          >
            <ul className="flex flex-col gap-1">
              <li>
                <FeaturesDropdown variant="mobile" onNavigate={closeMenu} />
              </li>
              <li>
                <ResourcesDropdown variant="mobile" onNavigate={closeMenu} />
              </li>
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="block rounded-lg px-3 py-3 text-base text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground active:bg-foreground/10"
                    onClick={closeMenu}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="mt-4 border-t border-foreground/10 pt-4">
                <AuthNavLink
                  className="block px-3 py-3 text-base"
                  onClick={closeMenu}
                />
              </li>
              <li className="px-3 pt-2">
                <TryAriaButton onClick={closeMenu} />
              </li>
            </ul>
          </nav>
        </>
      )}
    </header>
  );
}
