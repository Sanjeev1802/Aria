import { ARIA_SYSTEM_PROMPT } from "./system-prompt";
import type { ChatInput } from "./chat-input";
import type { Rates, Usage } from "./metering";
import { ServiceError } from "./errors";
import { MAX_OUTPUT_TOKENS } from "./bedrock";

export function anthropicConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() && process.env.ANTHROPIC_MODEL_ID?.trim());
}

export function anthropicModelConfig(_model: ChatInput["model"]) {
  const id = process.env.ANTHROPIC_MODEL_ID?.trim();
  const input = Number(process.env.ARIA_CLAUDE_INPUT_USD_PER_MILLION);
  const output = Number(process.env.ARIA_CLAUDE_OUTPUT_USD_PER_MILLION);
  const version = process.env.ARIA_RATE_VERSION;
  if (!id || !version || !Number.isFinite(input) || !Number.isFinite(output) || input <= 0 || output <= 0) {
    throw new ServiceError("model_or_rates_not_configured", 503);
  }
  return { id, rates: { input, output, version } satisfies Rates };
}

export async function* streamAnthropic(input: ChatInput, modelId: string, signal: AbortSignal, context?: string):
AsyncGenerator<{ text: string } | { usage: Usage; finishReason?: "end_turn" | "max_tokens" | "stop_sequence" }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new ServiceError("model_or_rates_not_configured", 503);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: context ? `${ARIA_SYSTEM_PROMPT}\n\n${context}` : ARIA_SYSTEM_PROMPT,
      messages: input.messages.map((message) => ({
        role: message.role,
        content: message.content.map((part) => ({ type: "text", text: part.text })),
      })),
      stream: true,
    }),
    signal,
  });
  if (!response.ok || !response.body) throw new Error("Provider stream failed");

  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let finishReason: "end_turn" | "max_tokens" | "stop_sequence" | undefined;
  for await (const event of readSse(response.body)) {
    if (event.type === "error") throw new Error("Provider stream failed");
    if (event.type === "message_start") {
      const tokens = event.message?.usage?.input_tokens;
      if (typeof tokens === "number") inputTokens = tokens;
    }
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
      yield { text: event.delta.text };
    }
    if (event.type === "message_delta") {
      const reason = event.delta?.stop_reason;
      if (reason === "end_turn" || reason === "max_tokens" || reason === "stop_sequence") finishReason = reason;
      else if (reason) throw new Error("Provider stopped without a usable response");
      const tokens = event.usage?.output_tokens;
      if (typeof tokens === "number") outputTokens = tokens;
    }
  }
  if (inputTokens === undefined || outputTokens === undefined) throw new Error("Missing token usage");
  yield { usage: { inputTokens, outputTokens }, finishReason };
}

type AnthropicEvent = {
  type?: string;
  delta?: { type?: string; text?: string; stop_reason?: string };
  message?: { usage?: { input_tokens?: number } };
  usage?: { output_tokens?: number };
};

async function* readSse(stream: ReadableStream<Uint8Array>): AsyncGenerator<AnthropicEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let split = buffer.indexOf("\n\n");
    while (split >= 0) {
      const block = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const data = block.split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (data && data !== "[DONE]") yield JSON.parse(data) as AnthropicEvent;
      split = buffer.indexOf("\n\n");
    }
  }
}
