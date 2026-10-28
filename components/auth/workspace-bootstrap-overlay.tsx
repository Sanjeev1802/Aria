"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AriaMark } from "@/components/aria-mark";
import { ThinkingStates } from "@/components/transitions/thinking-states";
import { ARIA_IS_PREVIEW, refreshAriaSession } from "@/lib/aria-session";

/** Sign-in: short path so chat opens quickly after credentials succeed. */
const SIGN_IN_STATES = ["Verifying your session", "Opening ARIA"] as const;

const SIGN_UP_STATES = [
  "Verifying your session",
  "Preparing your workspace",
  "Loading models and memory",
  "Syncing your conversations",
  "Opening ARIA",
] as const;

const SIGN_IN_EXIT_MS = 380;

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
  const isSignIn = intent === "sign-in";
  const states = isSignIn ? SIGN_IN_STATES : SIGN_UP_STATES;

  const finish = useCallback(() => {
    setExiting(true);
    if (ARIA_IS_PREVIEW) markPreviewSession();
    else void refreshAriaSession({ force: true });
    window.setTimeout(() => {
      onFinished?.();
      router.push(destination);
    }, isSignIn ? SIGN_IN_EXIT_MS : 450);
  }, [destination, isSignIn, onFinished, router]);

  return (
    <div
      className={`workspace-bootstrap${isSignIn ? " workspace-bootstrap--sign-in" : ""}${exiting ? " is-exiting" : ""}`}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="workspace-bootstrap-mark" aria-hidden="true">
        <AriaMark />
      </div>
      <p className="workspace-bootstrap-kicker">{isSignIn ? "Signing in" : "Creating your account"}</p>
      <ThinkingStates states={states} runOnce onComplete={finish} />
    </div>
  );
}
