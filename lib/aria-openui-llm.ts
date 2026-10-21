import { type ChatLLM } from "@openuidev/react-ui";
import { agUIAdapter } from "@openuidev/react-headless";
import { createAriaPreviewChatLLM } from "@/lib/aria-openui-preview-llm";
import { ariaFetch } from "@/lib/aria-session";

/**
 * Chat transport for AgentInterface.
 * Same-origin server transport. Preview is an explicit build-time opt-in.
 */
export function getAriaChatLLM(): ChatLLM {
  if (process.env.NEXT_PUBLIC_ARIA_PREVIEW === "true") return createAriaPreviewChatLLM();
  return {
    streamProtocol: agUIAdapter(),
    async send({ threadId, messages, signal }) {
      // One ID per send; a session-refresh retry reuses it, so the server cannot charge twice.
      const response = await ariaFetch("/api/chat/", {
        method: "POST", signal,
        body: JSON.stringify({ threadId, runId: crypto.randomUUID(), messages, webSearch: selectedWebSearch }),
      });
      if (!response.ok || !response.body) {
        window.dispatchEvent(new Event("aria:credits-updated"));
        return response;
      }
      const body = response.body.pipeThrough(new TransformStream({
        transform(chunk, controller) { controller.enqueue(chunk); },
        flush() { window.dispatchEvent(new Event("aria:credits-updated")); },
      }));
      return new Response(body, { status: response.status, headers: response.headers });
    },
  };
}

let selectedWebSearch = false;
export function selectAriaWebSearch(enabled: boolean) { selectedWebSearch = enabled; }
