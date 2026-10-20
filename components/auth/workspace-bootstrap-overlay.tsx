"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AriaMark } from "@/components/aria-mark";
import { ThinkingStates } from "@/components/transitions/thinking-states";
import { ARIA_IS_PREVIEW, refreshAriaSession } from "@/lib/aria-session";

const BOOTSTRAP_STATES = [
  "Verifying your session",
  "Preparing your workspace",
  "Loading models and memory",
  "Syncing your conversations",
  "Opening ARIA",
] as const;

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

export function WorkspaceBootstrapOverlay({ intent, destination = "/chat/", onFinished }: Props) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  const finish = useCallback(() => {
    setExiting(true);
    if (ARIA_IS_PREVIEW) markPreviewSession();
    else void refreshAriaSession();
    window.setTimeout(() => {
      onFinished?.();
      router.push(destination);
    }, 450);
  }, [destination, onFinished, router]);

  return (
    <div className={`workspace-bootstrap ${exiting ? "is-exiting" : ""}`} aria-live="polite" aria-busy="true">
      <div className="workspace-bootstrap-mark" aria-hidden="true">
        <AriaMark />
      </div>
      <p className="workspace-bootstrap-kicker">{intent === "sign-in" ? "Signing in" : "Creating your account"}</p>
      <ThinkingStates states={BOOTSTRAP_STATES} runOnce onComplete={finish} />
    </div>
  );
}
