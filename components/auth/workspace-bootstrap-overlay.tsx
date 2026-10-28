"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { AriaMark } from "@/components/aria-mark";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ARIA_IS_PREVIEW, refreshAriaSession } from "@/lib/aria-session";

const STEPS = ["Verifying your session", "Loading your workspace", "Opening ARIA"] as const;

/** Each step is held just long enough to read; the real session fetch can only make this longer. */
const STEP_MS = 260;
const EXIT_MS = 280;

const SESSION_KEY = "aria-preview-session";

type Props = {
  intent: "sign-in" | "sign-up";
  destination?: string;
  onFinished?: () => void;
};

/** Design-preview marker only; live sessions are HttpOnly server cookies. */
export function markPreviewSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {
    /* preview only */
  }
}

export function hasPreviewSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) != null;
  } catch {
    return false;
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Shown right after credentials succeed. Navigation starts as soon as the session is
 * confirmed, so the wait is the real work (about a second) rather than a scripted sequence.
 */
export function WorkspaceBootstrapOverlay({ intent, destination = "/chat/", onFinished }: Props) {
  const router = useRouter();
  const [done, setDone] = useState(0);
  const [exiting, setExiting] = useState(false);
  const isSignIn = intent === "sign-in";
  // Callers pass inline callbacks; keep the sequence from restarting on every render.
  const onFinishedRef = useRef(onFinished);
  useEffect(() => { onFinishedRef.current = onFinished; });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      router.prefetch(destination);
      if (ARIA_IS_PREVIEW) markPreviewSession();
      await Promise.all([ARIA_IS_PREVIEW ? undefined : refreshAriaSession({ force: true }), wait(STEP_MS)]);
      if (cancelled) return;
      setDone(1);
      await wait(STEP_MS);
      if (cancelled) return;
      setDone(2);
      await wait(STEP_MS);
      if (cancelled) return;
      setDone(3);
      setExiting(true);
      await wait(EXIT_MS);
      if (cancelled) return;
      onFinishedRef.current?.();
      router.push(destination);
    })();
    return () => { cancelled = true; };
  }, [destination, router]);

  return (
    <div
      className={cn("workspace-bootstrap workspace-bootstrap--sign-in", exiting && "is-exiting")}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Card className="w-full max-w-sm gap-6 bg-card/80 py-6 shadow-2xl">
        <CardContent className="flex flex-col gap-6 px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="workspace-bootstrap-mark" aria-hidden="true">
              <AriaMark />
            </span>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">{isSignIn ? "Welcome back" : "Getting you started"}</h1>
              <p className="text-sm text-muted-foreground">
                {isSignIn ? "Opening your workspace" : "Setting up your ARIA workspace"}
              </p>
            </div>
          </div>

          <ol className="flex flex-col gap-3">
            {STEPS.map((label, index) => {
              const complete = done > index;
              const active = done === index;
              return (
                <li
                  key={label}
                  className={cn(
                    "flex items-center gap-3 text-sm transition-colors duration-200",
                    complete ? "text-foreground" : active ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                      complete ? "border-transparent bg-primary text-primary-foreground" : "border-border",
                    )}
                    aria-hidden="true"
                  >
                    {complete ? <Check className="size-3" strokeWidth={3} /> : active ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" /> : null}
                  </span>
                  {label}
                </li>
              );
            })}
          </ol>

          <div className="grid grid-cols-[56px_1fr] gap-3 rounded-lg border border-border/60 p-3" aria-hidden="true">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <div className="flex flex-col justify-end gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-9 w-full rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
