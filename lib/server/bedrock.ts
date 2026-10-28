import { BedrockRuntimeClient, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { ARIA_SYSTEM_PROMPT, withModelLine } from "./system-prompt";
import type { ChatInput } from "./chat-input";
import type { ProviderRequest } from "./chat-service";
import type { Rates, Usage } from "./metering";
import { ServiceError } from "./errors";

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1", maxAttempts: 1 });
/** Ceiling for any plan; each plan may cap lower (see PLANS). */
export const MAX_OUTPUT_TOKENS = 4096;
/**
 * Operator override for accounts with small Bedrock quotas. Bedrock may hold
 * input + maxTokens against token quotas when a request starts, so a lower
 * ceiling stretches a daily quota further. Plans can still cap lower.
 */
export function configuredMaxOutputTokens(env: Record<string, string | undefined> = process.env) {
  const value = Number(env.ARIA_MAX_OUTPUT_TOKENS);
  return Number.isInteger(value) && value >= 256 && value <= MAX_OUTPUT_TOKENS ? value : MAX_OUTPUT_TOKENS;
}

/** Low temperature keeps analysis steady; topP trims unlikely tokens without flattening prose. */
const INFERENCE = { temperature: 0.3, topP: 0.9 };

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

export async function* streamBedrock(input: ChatInput, modelId: string, signal: AbortSignal, request: ProviderRequest):
AsyncGenerator<{ text: string } | { usage: Usage; finishReason?: "end_turn" | "max_tokens" | "stop_sequence" }> {
  const { webContext } = request;
  const messages = webContext ? input.messages.map((message, index) => index === input.messages.length - 1
    ? { ...message, content: [...message.content, { text: `\n\n${webContext}` }] }
    : message) : input.messages;
  const result = await client.send(new ConverseStreamCommand({
    modelId,
    system: [{ text: ARIA_SYSTEM_PROMPT }, { text: withModelLine(request.runtimeContext, `Amazon Nova (${modelId}) on Amazon Bedrock`) }],
    messages,
    inferenceConfig: { maxTokens: request.maxOutputTokens, ...INFERENCE },
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
