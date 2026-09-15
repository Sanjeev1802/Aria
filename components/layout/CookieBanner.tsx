"use client";

import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("aria-cookies-accepted");
    if (!accepted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only cookie consent
      setVisible(true);
    }
  }, []);

  function acceptCookies() {
    localStorage.setItem("aria-cookies-accepted", "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="safe-bottom fixed bottom-0 left-0 right-0 z-[60] border-t border-background/10 bg-dark px-5 py-4 text-background sm:px-8 sm:py-5"
    >
      <div className="mx-auto flex w-full max-w-[87.5rem] flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center sm:gap-6">
        <p className="min-w-0 font-serif text-sm leading-relaxed text-background/80 sm:text-base">
          We use cookies to improve your experience and analyze site traffic. By
          continuing, you agree to our use of cookies.
        </p>
        <button
          type="button"
          onClick={acceptCookies}
          className="w-full shrink-0 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto sm:py-2.5"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
