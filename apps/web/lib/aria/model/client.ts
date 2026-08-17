import { GoogleGenAI } from "@google/genai";
import { estimateTokens } from "@/lib/aria/tokens";
import {
  generationDefaults,
  getModelName,
  isLiveSearchEnabled,
  requireApiKey,
} from "./config";
import { buildSystemPrompt } from "./prompt";
import type { PromptContext } from "./types";

export type ChatTurn = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type GroundingSource = {
  title: string;
  url: string;
};

export type AriaReply = {
  content: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  sources: GroundingSource[];
  grounded: boolean;
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
  const liveSearch = isLiveSearchEnabled();

  const systemInstruction = buildSystemPrompt({
    ...options.context,
    liveSearch,
  });

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      ...generationDefaults,
      ...(liveSearch ? { tools: [{ googleSearch: {} }] } : {}),
    },
  });

  const content = response.text?.trim();
  if (!content) {
    throw new Error("The model returned an empty response");
  }

  const sources = extractSources(response as GroundedResponse);
  const usage = response.usageMetadata;

  return {
    content,
    promptTokens:
      usage?.promptTokenCount ??
      estimateTokens(
        `${systemInstruction}\n${options.messages.map((m) => m.content).join("\n")}`,
      ),
    completionTokens: usage?.candidatesTokenCount ?? estimateTokens(content),
    model,
    sources,
    grounded: sources.length > 0,
  };
}
