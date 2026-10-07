import { isLiveSearchEnabled } from "./config";
import { messageNeedsLiveSearch } from "./search";
import type { ChatTurn, SearchStatus } from "./types";

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export function mergeConversationTurns(messages: ChatTurn[]): ConversationTurn[] {
  const turns = messages.filter(
    (message) => message.role !== "system" && message.content.trim(),
  );
  const merged: ConversationTurn[] = [];

  for (const turn of turns) {
    const role = turn.role === "assistant" ? "assistant" : "user";
    const last = merged[merged.length - 1];
    if (last?.role === role) {
      last.content = `${last.content}\n\n${turn.content}`;
    } else {
      merged.push({ role, content: turn.content });
    }
  }

  if (merged[0]?.role === "assistant") {
    merged.unshift({ role: "user", content: "(continue)" });
  }

  return merged;
}

function lastUserMessage(messages: ChatTurn[]) {
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}

export function resolveSearchStatus(messages: ChatTurn[]): SearchStatus {
  if (!isLiveSearchEnabled()) return "disabled";
  if (!messageNeedsLiveSearch(lastUserMessage(messages))) return "not_needed";
  return "unavailable";
}
