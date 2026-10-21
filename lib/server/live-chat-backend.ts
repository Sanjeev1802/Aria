import type { ChatDeps } from "./handlers";
import type { ModelChoice } from "./accounts/entitlements";

type Backend = Pick<ChatDeps, "provider" | "modelConfig">;

/** Keep model pricing and inference on the same backend for each request. */
export function routeLiveChat(options: {
  bedrock: Backend;
  anthropic: Backend;
  anthropicAvailable: boolean;
  maxOutputTokens: number;
}): ChatDeps {
  const backendFor = (model: ModelChoice) => model === "claude" && options.anthropicAvailable
    ? options.anthropic : options.bedrock;
  return {
    modelConfig: model => backendFor(model).modelConfig(model),
    provider: (input, modelId, signal, context) => backendFor(input.model).provider(input, modelId, signal, context),
    maxOutputTokens: options.maxOutputTokens,
  };
}
