import type { Message } from "@openuidev/react-headless";
import { parseMessage } from "@openuidev/react-lang";

/** Id of the live assistant message in a thread, or null. */
export function getLastAssistantMessageId(messages: Message[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const role = messages[i]?.role;
    if (role === "assistant") return messages[i]!.id;
    if (role === "user") return null;
  }
  return null;
}

/** parseMessage, plus legacy stored XML envelopes. */
export function readMessage(raw: string, streaming = false) {
  const parsed = parseMessage(raw, { streaming });
  if (raw.includes("]]>openui:")) return parsed;

  let content = parsed.content;
  let context: unknown = null;
  const contextMatch = content.match(/<context>([\s\S]*)<\/context>\s*$/);
  if (contextMatch) {
    context = contextMatch[1];
    content = content.slice(0, contextMatch.index).trimEnd();
    try {
      context = JSON.parse(contextMatch[1]!);
    } catch {
      // keep raw text
    }
  }
  content = content.match(/^<content[^>]*>([\s\S]*)<\/content>\s*$/)?.[1] ?? content;
  return { ...parsed, content, context };
}
