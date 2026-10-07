/** Model + generation configuration, resolved from the environment. */

export const DEFAULT_BEDROCK_MODEL = "apac.amazon.nova-micro-v1:0";
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
export const DEFAULT_REGION = "ap-southeast-1";

export const generationDefaults = {
  /** High enough for a natural voice, low enough to stay grounded. */
  temperature: 0.75,
  topP: 0.95,
  maxTokens: 2048,
} as const;

export type ModelProvider = "anthropic" | "bedrock";

export function getModelProvider(): ModelProvider {
  if (getAnthropicApiKey()) return "anthropic";
  return "bedrock";
}

export function getAnthropicApiKey() {
  return process.env.ANTHROPIC_API_KEY?.trim() || "";
}

export function getAnthropicModelName() {
  return (
    process.env.ANTHROPIC_MODEL_ID?.trim() ||
    process.env.ANTHROPIC_MODEL?.trim() ||
    DEFAULT_ANTHROPIC_MODEL
  );
}

export function getModelName() {
  if (getModelProvider() === "anthropic") {
    return getAnthropicModelName();
  }
  return (
    process.env.BEDROCK_MODEL_ID?.trim() ||
    process.env.BEDROCK_MODEL?.trim() ||
    DEFAULT_BEDROCK_MODEL
  );
}

export function getRegion() {
  return (
    process.env.BEDROCK_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    DEFAULT_REGION
  );
}

export function getBedrockApiKey() {
  return (
    process.env.BEDROCK_API_KEY?.trim() ||
    process.env.AWS_BEARER_TOKEN_BEDROCK?.trim() ||
    ""
  );
}

/** @deprecated Use getBedrockApiKey or getAnthropicApiKey. */
export function getApiKey() {
  return getAnthropicApiKey() || getBedrockApiKey();
}

export function requireModelCredentials() {
  if (getAnthropicApiKey()) return getAnthropicApiKey();
  const bedrockKey = getBedrockApiKey();
  if (bedrockKey) return bedrockKey;
  throw new Error(
    "ANTHROPIC_API_KEY or BEDROCK_API_KEY must be configured",
  );
}

/** @deprecated Use requireModelCredentials. */
export function requireApiKey() {
  return requireModelCredentials();
}

/**
 * Live web search is not attached yet (Tavily/Brave later).
 * Explicitly set BEDROCK_ENABLE_SEARCH=true only once a search tool exists.
 */
export function isLiveSearchEnabled() {
  const raw = process.env.BEDROCK_ENABLE_SEARCH?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}
