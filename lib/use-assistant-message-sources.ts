"use client";

import {
  getAssistantMessageSources,
  subscribeAssistantMessageSources,
} from "@/lib/aria-message-sources";
import { useSyncExternalStore } from "react";

export function useAssistantMessageSources(messageId: string) {
  return useSyncExternalStore(
    subscribeAssistantMessageSources,
    () => getAssistantMessageSources(messageId),
    () => getAssistantMessageSources(messageId),
  );
}
