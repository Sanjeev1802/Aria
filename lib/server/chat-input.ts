export type ChatInput = { id: string; model: "nova"; messages: { role: "user" | "assistant"; content: { text: string }[] }[] };

export function parseChatInput(raw: unknown): ChatInput {
  if (!raw || typeof raw !== "object") throw new Error("Expected a chat request");
  const body = raw as Record<string, unknown>;
  if (typeof body.runId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(body.runId)) throw new Error("Invalid request ID");
  const model = body.model ?? "nova";
  if (model !== "nova") throw new Error("Unsupported model");
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 40) throw new Error("Send 1–40 messages");
  let bytes = 0;
  const messages = body.messages.map((m: unknown) => {
    if (!m || typeof m !== "object") throw new Error("Invalid message");
    const message = m as Record<string, unknown>;
    if (message.role !== "user" && message.role !== "assistant") throw new Error("Only user and assistant messages are accepted");
    let text: string;
    if (typeof message.content === "string") text = message.content;
    else if (Array.isArray(message.content) && message.content.every(p => p?.type === "text" && typeof p.text === "string")) {
      text = message.content.map(p => p.text).join("\n");
    } else throw new Error("File processing is not connected. Send text only.");
    // The renderer stores a fixed OpenUI TextContent wrapper; return plain history to the model.
    if (message.role === "assistant" && text.startsWith("root = TextContent(") && text.endsWith(")")) {
      try { const parsed = JSON.parse(text.slice(19,-1)); if (typeof parsed === "string") text = parsed; } catch { /* bounded untrusted history */ }
    }
    bytes += Buffer.byteLength(text, "utf8");
    if (!text.trim() || bytes > 32_000) throw new Error("Conversation is empty or too long. Start a new chat.");
    return { role: message.role, content: [{ text }] };
  });
  if (messages[0].role !== "user" || messages.at(-1)?.role !== "user") throw new Error("Conversation must start and end with a user message");
  // A failed reply leaves two user turns in a row; merge same-role neighbours so the thread keeps working.
  const turns: ChatInput["messages"] = [];
  for (const message of messages) {
    const previous = turns.at(-1);
    if (previous?.role === message.role) previous.content.push(...message.content);
    else turns.push({ role: message.role as "user" | "assistant", content: [...message.content] });
  }
  return { id: body.runId, model, messages: turns } as ChatInput;
}
