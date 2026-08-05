"use client";

import { useEffect } from "react";

const workspaceUrl =
  process.env.NEXT_PUBLIC_WORKSPACE_URL ?? "http://localhost:3001";

export default function WebSignInRedirectPage() {
  useEffect(() => {
    window.location.replace(`${workspaceUrl}/sign-in`);
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background text-foreground">
      <p className="text-sm text-foreground/60">Taking you to ARIA sign in…</p>
    </main>
  );
}
