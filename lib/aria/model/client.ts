import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandOutput,
  type Message,
} from "@aws-sdk/client-bedrock-runtime";
import { estimateTokens } from "@/lib/aria/tokens";
import {
  generationDefaults,
  getModelName,
  getRegion,
  isLiveSearchEnabled,
  requireApiKey,
} from "./config";
import { buildSystemPrompt } from "./prompt";
import { messageNeedsLiveSearch } from "./search";
import type { PromptContext } from "./types";

export type ChatTurn = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type GroundingSource = {
  title: string;
  url: string;
};

/** Why the reply did or did not use live web grounding. */
export type SearchStatus =
  | "used"
  | "not_needed"
  | "disabled"
  | "unavailable";

export type AriaReply = {
  content: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  sources: GroundingSource[];
  grounded: boolean;
  searchStatus: SearchStatus;
};

let cachedClient: BedrockRuntimeClient | null = null;
let cachedClientKey = "";

function getBedrockClient() {
  const apiKey = requireApiKey();
  const region = getRegion();
  const cacheKey = `${region}:${apiKey}`;

  if (cachedClient && cachedClientKey === cacheKey) {
    return cachedClient;
  }

  // Prefer the Bedrock API key over the IAM credential chain.
  process.env.AWS_BEARER_TOKEN_BEDROCK = apiKey;

  cachedClient = new BedrockRuntimeClient({
    region,
    authSchemePreference: ["httpBearerAuth"],
    token: { token: apiKey },
  });
  cachedClientKey = cacheKey;
  return cachedClient;
}

function toBedrockMessages(messages: ChatTurn[]): Message[] {
  const turns = messages.filter(
    (message) => message.role !== "system" && message.content.trim(),
  );
  const merged: Message[] = [];

  for (const turn of turns) {
    const role = turn.role === "assistant" ? "assistant" : "user";
    const last = merged[merged.length - 1];
    if (last?.role === role) {
      const existing = last.content?.[0];
      const previous = existing && "text" in existing ? existing.text ?? "" : "";
      last.content = [{ text: `${previous}\n\n${turn.content}` }];
    } else {
      merged.push({ role, content: [{ text: turn.content }] });
    }
  }

  if (merged[0]?.role === "assistant") {
    merged.unshift({
      role: "user",
      content: [{ text: "(continue)" }],
    });
  }

  return merged;
}

function extractText(response: ConverseCommandOutput) {
  const parts = response.output?.message?.content ?? [];
  return parts
    .map((part) => ("text" in part ? part.text?.trim() : ""))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function lastUserMessage(messages: ChatTurn[]) {
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}

function resolveSearchStatus(messages: ChatTurn[]): SearchStatus {
  if (!isLiveSearchEnabled()) return "disabled";
  if (!messageNeedsLiveSearch(lastUserMessage(messages))) return "not_needed";
  return "unavailable";
}

export async function generateAriaReply(options: {
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

  const response = await client.send(
    new ConverseCommand({
      modelId: model,
      system: [
        {
          text: buildSystemPrompt({
            ...options.context,
            liveSearch: searchStatus === "used",
          }),
        },
      ],
      messages: conversation,
      inferenceConfig: {
        temperature: generationDefaults.temperature,
        topP: generationDefaults.topP,
        maxTokens: generationDefaults.maxTokens,
      },
    }),
  );

  const content = extractText(response);
  if (!content) {
    throw new Error("The model returned an empty response");
  }

  const usage = response.usage;

  return {
    content,
    promptTokens:
      usage?.inputTokens ??
      estimateTokens(options.messages.map((m) => m.content).join("\n")),
    completionTokens: usage?.outputTokens ?? estimateTokens(content),
    model,
    sources: [],
    grounded: false,
    searchStatus,
  };
}
