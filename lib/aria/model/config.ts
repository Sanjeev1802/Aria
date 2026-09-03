/** Model + generation configuration, resolved from the environment. */

export const DEFAULT_MODEL = "apac.amazon.nova-micro-v1:0";
export const DEFAULT_REGION = "ap-southeast-1";

export const generationDefaults = {
  /** High enough for a natural voice, low enough to stay grounded. */
  temperature: 0.75,
  topP: 0.95,
  maxTokens: 2048,
} as const;

export function getModelName() {
  return (
    process.env.BEDROCK_MODEL_ID?.trim() ||
    process.env.BEDROCK_MODEL?.trim() ||
    DEFAULT_MODEL
  );
}

export function getRegion() {
  return (
    process.env.BEDROCK_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    DEFAULT_REGION
  );
}

export function requireApiKey() {
  const key =
    process.env.BEDROCK_API_KEY?.trim() ||
    process.env.AWS_BEARER_TOKEN_BEDROCK?.trim();
  if (!key) {
    throw new Error("BEDROCK_API_KEY is not configured");
  }
  return key;
}

/**
 * Live web search is not attached to Bedrock yet (Tavily/Brave later).
 * Explicitly set BEDROCK_ENABLE_SEARCH=true only once a search tool exists.
 */
export function isLiveSearchEnabled() {
  const raw = process.env.BEDROCK_ENABLE_SEARCH?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}
