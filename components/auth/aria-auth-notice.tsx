"use client";

import { AUTH_NOTICE_EVENT } from "@/lib/aria-session";
import { useEffect, useState } from "react";

const MESSAGES: Record<string, string> = {
  session_expired: "Your session expired. Sign in again to continue.",
  session_revoked: "You were signed out on all devices. Sign in again to continue.",
};

export function AriaAuthNotice() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onNotice = (event: Event) => {
      const code = (event as CustomEvent<{ code?: string }>).detail?.code;
      if (code && MESSAGES[code]) setMessage(MESSAGES[code]!);
    };
    window.addEventListener(AUTH_NOTICE_EVENT, onNotice);
    return () => window.removeEventListener(AUTH_NOTICE_EVENT, onNotice);
  }, []);

  if (!message) return null;
  return (
    <div role="status" className="pointer-events-none fixed left-3 right-3 top-3 z-[60] mx-auto max-w-lg rounded-md border border-amber-500/40 bg-amber-950/90 px-3 py-2 text-center text-xs text-amber-100">
      {message}
    </div>
  );
}
