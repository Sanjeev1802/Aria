import { EventType, agUIAdapter, type ChatLLM, type Message } from "@openuidev/react-headless";
import { setAssistantMessageSources } from "@/lib/aria-message-sources";
import { inferPreviewChatMode, previewAssistantReply } from "@/lib/chat-preview";

function lastUserText(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const content = m.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      const text = content
        .map((part) => (typeof part === "string" ? part : "text" in part ? String(part.text ?? "") : ""))
        .join("");
      if (text.trim()) return text;
    }
  }
  return "";
}

/** Wrap plain assistant text as minimal OpenUI Lang for `openuiChatLibrary`. */
export function plainTextToOpenUILang(text: string): string {
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "\\n");
  return `root = TextContent("${escaped}")`;
}

function encodeSseEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

async function streamPreviewBody(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  fullText: string,
  signal: AbortSignal,
  assistantMessageId: string,
  sources: ReturnType<typeof previewAssistantReply>["sources"],
) {
  const messageId = assistantMessageId;
  const lang = plainTextToOpenUILang(fullText);

  controller.enqueue(
    encoder.encode(
      encodeSseEvent({
        type: EventType.TEXT_MESSAGE_START,
        messageId,
        role: "assistant",
      }),
    ),
  );

  const chunkSize = 12;
  for (let i = 0; i < lang.length; i += chunkSize) {
    if (signal.aborted) break;
    const delta = lang.slice(i, i + chunkSize);
    controller.enqueue(
      encoder.encode(
        encodeSseEvent({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId,
          delta,
        }),
      ),
    );
    await new Promise((r) => setTimeout(r, 16));
  }

  controller.enqueue(
    encoder.encode(
      encodeSseEvent({
        type: EventType.TEXT_MESSAGE_END,
        messageId,
      }),
    ),
  );
  setAssistantMessageSources(messageId, sources);
  controller.close();
}

/** Local preview transport (static export–friendly). */
export function createAriaPreviewChatLLM(): ChatLLM {
  return {
    streamProtocol: agUIAdapter(),
    send: async ({ messages, signal }) => {
      const prompt = lastUserText(messages);
      const mode = inferPreviewChatMode(prompt);
      const { text, sources } = previewAssistantReply(prompt, mode);
      const assistantMessageId = crypto.randomUUID();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder();
          void streamPreviewBody(
            controller,
            encoder,
            text,
            signal,
            assistantMessageId,
            sources,
          ).catch((err) => {
            controller.error(err);
          });
        },
      });

      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      });
    },
  };
}
