import Anthropic from "@anthropic-ai/sdk";
import { estimateTokens } from "@/lib/aria/tokens";
import { mergeConversationTurns, resolveSearchStatus } from "./conversation";
import {
  generationDefaults,
  getAnthropicApiKey,
  getAnthropicModelName,
} from "./config";
import { buildSystemPrompt } from "./prompt";
import type { AriaReply, ChatTurn } from "./types";
import type { PromptContext } from "./types";

let cachedClient: Anthropic | null = null;
let cachedClientKey = "";

function getAnthropicClient() {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  if (cachedClient && cachedClientKey === apiKey) {
    return cachedClient;
  }

  cachedClient = new Anthropic({ apiKey });
  cachedClientKey = apiKey;
  return cachedClient;
}

function extractText(response: Anthropic.Messages.Message) {
  return response.content
    .map((part) => (part.type === "text" ? part.text.trim() : ""))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export async function generateAnthropicReply(options: {
  messages: ChatTurn[];
  context?: PromptContext;
}): Promise<AriaReply> {
  const conversation = mergeConversationTurns(options.messages);
  if (conversation.length === 0) {
    throw new Error("At least one user message is required");
  }

  const model = getAnthropicModelName();
  const searchStatus = resolveSearchStatus(options.messages);
  const client = getAnthropicClient();
  const system = buildSystemPrompt({
    ...options.context,
    liveSearch: searchStatus === "used",
  });

  const response = await client.messages.create({
    model,
    max_tokens: generationDefaults.maxTokens,
    temperature: generationDefaults.temperature,
    system,
    messages: conversation,
  });

  const content = extractText(response);
  if (!content) {
    throw new Error("The model returned an empty response");
  }

  const promptTokens =
    response.usage.input_tokens ||
    estimateTokens(options.messages.map((m) => m.content).join("\n"));
  const completionTokens =
    response.usage.output_tokens || estimateTokens(content);

  return {
    content,
    promptTokens,
    completionTokens,
    model,
    sources: [],
    grounded: false,
    searchStatus,
  };
}
