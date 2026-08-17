/** Model + generation configuration, resolved from the environment. */

export const DEFAULT_MODEL = "gemini-3.1-flash-lite-preview";

export const generationDefaults = {
  /** High enough for a natural voice, low enough to stay grounded. */
  temperature: 0.75,
  topP: 0.95,
  maxOutputTokens: 2048,
} as const;

export function getModelName() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function requireApiKey() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return key;
}

/** Live web grounding via Google Search. Enabled unless explicitly turned off. */
export function isLiveSearchEnabled() {
  const raw = process.env.GEMINI_ENABLE_SEARCH?.trim().toLowerCase();
  return !(raw === "0" || raw === "false" || raw === "off");
}
