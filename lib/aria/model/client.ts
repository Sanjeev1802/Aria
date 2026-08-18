import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { estimateTokens } from "@/lib/aria/tokens";
import {
  generationDefaults,
  getModelName,
  isLiveSearchEnabled,
  requireApiKey,
} from "./config";
import { buildSystemPrompt } from "./prompt";
import {
  isGroundingCoolingDown,
  isQuotaError,
  messageNeedsLiveSearch,
  startGroundingCooldown,
} from "./search";
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

const MAX_SOURCES = 8;

type GroundedResponse = {
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
  }>;
};

function toGeminiContents(messages: ChatTurn[]) {
  return messages
    .filter((message) => message.role !== "system" && message.content.trim())
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));
}

function extractSources(response: GroundedResponse): GroundingSource[] {
  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const chunk of chunks) {
    const url = chunk.web?.uri?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: chunk.web?.title?.trim() || url, url });
    if (sources.length === MAX_SOURCES) break;
  }

  return sources;
}

function lastUserMessage(messages: ChatTurn[]) {
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}

function resolveSearchPlan(messages: ChatTurn[]): {
  attempt: boolean;
  status: SearchStatus;
} {
  if (!isLiveSearchEnabled()) return { attempt: false, status: "disabled" };
  if (isGroundingCoolingDown()) return { attempt: false, status: "unavailable" };
  if (!messageNeedsLiveSearch(lastUserMessage(messages))) {
    return { attempt: false, status: "not_needed" };
  }
  return { attempt: true, status: "used" };
}

export async function generateAriaReply(options: {
  messages: ChatTurn[];
  context?: PromptContext;
}): Promise<AriaReply> {
  const contents = toGeminiContents(options.messages);
  if (contents.length === 0) {
    throw new Error("At least one user message is required");
  }

  const apiKey = requireApiKey();
  const model = getModelName();
  const ai = new GoogleGenAI({ apiKey });
  const plan = resolveSearchPlan(options.messages);

  const call = (withSearch: boolean) =>
    ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: buildSystemPrompt({
          ...options.context,
          liveSearch: withSearch,
        }),
        ...generationDefaults,
        ...(withSearch ? { tools: [{ googleSearch: {} }] } : {}),
      },
    });

  let response: GenerateContentResponse;
  let searchStatus: SearchStatus = plan.status;

  if (plan.attempt) {
    try {
      response = await call(true);
    } catch (error) {
      // Grounding is metered separately, so quota can run out while plain
      // generation still works. Fall back rather than failing the message.
      if (!isQuotaError(error)) throw error;
      startGroundingCooldown();
      searchStatus = "unavailable";
      response = await call(false);
    }
  } else {
    response = await call(false);
  }

  const content = response.text?.trim();
  if (!content) {
    throw new Error("The model returned an empty response");
  }

  const sources = extractSources(response as GroundedResponse);
  if (searchStatus === "used" && sources.length === 0) {
    searchStatus = "not_needed";
  }

  const usage = response.usageMetadata;

  return {
    content,
    promptTokens:
      usage?.promptTokenCount ??
      estimateTokens(options.messages.map((m) => m.content).join("\n")),
    completionTokens: usage?.candidatesTokenCount ?? estimateTokens(content),
    model,
    sources,
    grounded: sources.length > 0,
    searchStatus,
  };
}
