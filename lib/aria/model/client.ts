import { generateAnthropicReply } from "./anthropic-client";
import { generateBedrockReply } from "./bedrock-client";
import { getModelProvider } from "./config";
import type { AriaReply, ChatTurn, GroundingSource, SearchStatus } from "./types";
import type { PromptContext } from "./types";

export type { AriaReply, ChatTurn, GroundingSource, SearchStatus };

export async function generateAriaReply(options: {
  messages: ChatTurn[];
  context?: PromptContext;
}): Promise<AriaReply> {
  if (getModelProvider() === "anthropic") {
    return generateAnthropicReply(options);
  }
  return generateBedrockReply(options);
}
