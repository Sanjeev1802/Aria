import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandOutput,
  type Message,
} from "@aws-sdk/client-bedrock-runtime";
import { estimateTokens } from "@/lib/aria/tokens";
import { mergeConversationTurns, resolveSearchStatus } from "./conversation";
import {
  generationDefaults,
  getBedrockApiKey,
  getModelName,
  getRegion,
} from "./config";
import { buildSystemPrompt } from "./prompt";
import type { AriaReply, ChatTurn, PromptContext } from "./types";

let cachedClient: BedrockRuntimeClient | null = null;
let cachedClientKey = "";

function getBedrockClient() {
  const apiKey = getBedrockApiKey();
  const region = getRegion();
  const cacheKey = `${region}:${apiKey || "iam"}`;

  if (cachedClient && cachedClientKey === cacheKey) {
    return cachedClient;
  }

  if (apiKey) {
    process.env.AWS_BEARER_TOKEN_BEDROCK = apiKey;
    cachedClient = new BedrockRuntimeClient({
      region,
      authSchemePreference: ["httpBearerAuth"],
      token: { token: apiKey },
    });
  } else {
    cachedClient = new BedrockRuntimeClient({ region });
  }

  cachedClientKey = cacheKey;
  return cachedClient;
}

function toBedrockMessages(messages: ChatTurn[]): Message[] {
  return mergeConversationTurns(messages).map((turn) => ({
    role: turn.role,
    content: [{ text: turn.content }],
  }));
}

function extractText(response: ConverseCommandOutput) {
  const parts = response.output?.message?.content ?? [];
  return parts
    .map((part) => ("text" in part ? part.text?.trim() : ""))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

/** Nova Micro sometimes emits its baked-in Amazon identity on refusals. */
function leaksVendorIdentity(text: string) {
  return /\b(amazon nova|amazon bedrock|built by amazon|team of inventors|as an ai system)\b/i.test(
    text,
  );
}

export async function generateBedrockReply(options: {
  messages: ChatTurn[];
  context?: PromptContext;
}): Promise<AriaReply> {
  const conversation = toBedrockMessages(options.messages);
  if (conversation.length === 0) {
    throw new Error("At least one user message is required");
  }

  const model = getModelName();
  const searchStatus = resolveSearchStatus(options.messages);
  const client = getBedrockClient();
  const system = buildSystemPrompt({
    ...options.context,
    liveSearch: searchStatus === "used",
  });
  const inferenceConfig = {
    temperature: generationDefaults.temperature,
    topP: generationDefaults.topP,
    maxTokens: generationDefaults.maxTokens,
  };

  const run = (systemText: string) =>
    client.send(
      new ConverseCommand({
        modelId: model,
        system: [{ text: systemText }],
        messages: conversation,
        inferenceConfig,
      }),
    );

  const response = await run(system);
  let content = extractText(response);
  let promptTokens = response.usage?.inputTokens ?? 0;
  let completionTokens = response.usage?.outputTokens ?? 0;

  if (content && leaksVendorIdentity(content)) {
    const retry = await run(
      `${system}\n\nRewrite as ARIA. Do not mention Amazon, Nova, Bedrock, inventors, or a training cut-off. Answer the user's question.`,
    );
    const retried = extractText(retry);
    if (retried && !leaksVendorIdentity(retried)) {
      content = retried;
    }
    promptTokens += retry.usage?.inputTokens ?? 0;
    completionTokens += retry.usage?.outputTokens ?? 0;
  }

  if (!content) {
    throw new Error("The model returned an empty response");
  }

  return {
    content,
    promptTokens:
      promptTokens ||
      estimateTokens(options.messages.map((m) => m.content).join("\n")),
    completionTokens: completionTokens || estimateTokens(content),
    model,
    sources: [],
    grounded: false,
    searchStatus,
  };
}
