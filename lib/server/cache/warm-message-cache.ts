import { createHash } from "node:crypto";
import { normalizeChatPhrase } from "../builtin-replies";
import { PROMPT_VERSION } from "../system-prompt";
import { MESSAGE_CACHE_TTL_SECONDS } from "./message-cache";
import type { SearchCache } from "./search-cache";

/** Pre-seeded answers for frequent greetings; no model call when ElastiCache is configured. */
const WARM_RESPONSES: Record<string, string> = {
  hi: "Hello. What can I help you with?",
  hello: "Hello. What can I help you with?",
  hey: "Hello. What can I help you with?",
  "how are you": "I'm here and ready to help. What would you like to work on?",
  "how are u": "I'm here and ready to help. What would you like to work on?",
  thanks: "You're welcome. What should we look at next?",
  "thank you": "You're welcome. What should we look at next?",
};

function warmKey(normalized: string, modelId: string) {
  const digest = createHash("sha256").update(`${modelId}\0${PROMPT_VERSION}\0${normalized}`).digest("hex");
  return `aria:chat-response:v1:${digest}`;
}

/** Writes common phrases once per process; SETEX refreshes the 30-day expiry on each deploy. */
export async function warmMessageCache(cache: SearchCache, modelId = "nova") {
  await Promise.all(Object.entries(WARM_RESPONSES).map(async ([phrase, text]) => {
    const normalized = normalizeChatPhrase(phrase);
    const key = warmKey(normalized, modelId);
    const value = JSON.stringify({ text, modelId, promptVersion: PROMPT_VERSION });
    try { await cache.set(key, value, MESSAGE_CACHE_TTL_SECONDS); } catch { /* ignore */ }
  }));
}
