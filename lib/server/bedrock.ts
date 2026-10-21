import { BedrockRuntimeClient, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { ARIA_SYSTEM_PROMPT } from "./system-prompt";
import type { ChatInput } from "./chat-input";
import type { Rates, Usage } from "./metering";
import { ServiceError } from "./errors";

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1", maxAttempts: 1 });
export const MAX_OUTPUT_TOKENS = 1024;

export function modelConfig(_model: ChatInput["model"]) {
  const id = process.env.ARIA_NOVA_MODEL_ID;
  const input = Number(process.env.ARIA_NOVA_INPUT_USD_PER_MILLION);
  const output = Number(process.env.ARIA_NOVA_OUTPUT_USD_PER_MILLION);
  const version = process.env.ARIA_RATE_VERSION;
  if (!id || !version || !Number.isFinite(input) || !Number.isFinite(output) || input <= 0 || output <= 0) {
    throw new ServiceError("model_or_rates_not_configured", 503);
  }
  return { id, rates: { input, output, version } satisfies Rates };
}

export async function* streamBedrock(input: ChatInput, modelId: string, signal: AbortSignal, context?: string):
AsyncGenerator<{ text: string } | { usage: Usage; finishReason?: "end_turn" | "max_tokens" | "stop_sequence" }> {
  const messages = context ? input.messages.map((message, index) => index === input.messages.length - 1
    ? { ...message, content: [...message.content, { text: `\n\n${context}` }] }
    : message) : input.messages;
  const result = await client.send(new ConverseStreamCommand({
    modelId,
    system: [{ text: ARIA_SYSTEM_PROMPT }],
    messages,
    inferenceConfig: { maxTokens: MAX_OUTPUT_TOKENS },
  }), { abortSignal: signal });
  if (!result.stream) throw new Error("Missing provider stream");
  let stopped = false;
  let finishReason: "end_turn" | "max_tokens" | "stop_sequence" | undefined;
  for await (const event of result.stream) {
    if (event.contentBlockDelta?.delta?.text) yield { text: event.contentBlockDelta.delta.text };
    if (event.messageStop) {
      stopped = true;
      if (!["end_turn", "max_tokens", "stop_sequence"].includes(event.messageStop.stopReason ?? "")) {
        throw new Error("Provider stopped without a usable response");
      }
      finishReason = event.messageStop.stopReason as typeof finishReason;
    }
    if (event.metadata?.usage) {
      if (!stopped) throw new Error("Usage arrived before response completion");
      const { inputTokens, outputTokens } = event.metadata.usage;
      if (inputTokens === undefined || outputTokens === undefined) throw new Error("Missing token usage");
      yield { usage: { inputTokens, outputTokens }, finishReason };
    }
    if (event.internalServerException || event.modelStreamErrorException ||
        event.throttlingException || event.validationException || event.serviceUnavailableException) {
      throw new Error("Provider stream failed");
    }
  }
}
