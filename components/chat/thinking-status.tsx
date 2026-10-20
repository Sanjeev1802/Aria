"use client";

import { ThinkingStates } from "@/components/transitions/thinking-states";

const CHAT_STATES = ["Checking permissions", "Reviewing sources", "Composing answer"] as const;

/** Chat workspace — transitions.dev 28-thinking-states (looping). */
export function ThinkingStatus() {
  return <ThinkingStates states={CHAT_STATES} className="text-left text-[13px]" />;
}
