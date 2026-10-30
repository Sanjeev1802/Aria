import { createHash } from "node:crypto";
import type { ChatInput } from "../chat-input";
import { PROMPT_VERSION } from "../system-prompt";
import { normalizeChatPhrase } from "../builtin-replies";
import type { SearchCache } from "./search-cache";

/** Cached model answers expire after 30 days. */
export const MESSAGE_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
const CACHE_TIMEOUT_MS = 200;
const MAX_CACHED_BYTES = 32_000;

export type CachedMessagePayload = { text: string; modelId: string; promptVersion: string };

function lastUserText(input: ChatInput) {
  const last = [...input.messages].reverse().find(message => message.role === "user");
  return last?.content.map(part => part.text).join("\n") ?? "";
}

function isTimeSensitivePhrase(normalized: string) {
  return /^(time|what time|tell me the time|current time)/.test(normalized) || normalized.includes("what time is it");
}

/** Repeatable FAQ-style turns: keyed on the latest user message (not whole thread). */
export function messageCacheEligible(input: ChatInput, options: { webSearch?: boolean; nativeSearch?: boolean }) {
  void options.nativeSearch;
  if (options.webSearch) return false;
  if (input.messages.at(-1)?.role !== "user") return false;
  const raw = lastUserText(input).trim();
  if (!raw || raw.length > 500 || Buffer.byteLength(raw, "utf8") > 2_000) return false;
  const normalized = normalizeChatPhrase(raw);
  if (!normalized || isTimeSensitivePhrase(normalized)) return false;
  return true;
}

export function messageCacheKey(input: ChatInput, modelId: string) {
  const normalized = normalizeChatPhrase(lastUserText(input));
  const digest = createHash("sha256").update(`${modelId}\0${PROMPT_VERSION}\0${normalized}`).digest("hex");
  return `aria:chat-response:v1:${digest}`;
}

async function briefly<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("cache timeout")), CACHE_TIMEOUT_MS); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function parseCached(raw: string): CachedMessagePayload | undefined {
  if (Buffer.byteLength(raw, "utf8") > MAX_CACHED_BYTES) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return undefined;
    const row = parsed as Record<string, unknown>;
    if (typeof row.text !== "string" || !row.text.trim()) return undefined;
    if (typeof row.modelId !== "string" || typeof row.promptVersion !== "string") return undefined;
    if (row.promptVersion !== PROMPT_VERSION) return undefined;
    return { text: row.text, modelId: row.modelId, promptVersion: row.promptVersion };
  } catch {
    return undefined;
  }
}

export async function readMessageCache(cache: SearchCache, input: ChatInput, modelId: string): Promise<string | undefined> {
  try {
    const hit = await briefly(cache.get(messageCacheKey(input, modelId)));
    if (!hit) return undefined;
    const parsed = parseCached(hit);
    if (!parsed || parsed.modelId !== modelId) return undefined;
    return parsed.text;
  } catch {
    return undefined;
  }
}

export async function writeMessageCache(cache: SearchCache, input: ChatInput, modelId: string, text: string): Promise<void> {
  const payload: CachedMessagePayload = { text, modelId, promptVersion: PROMPT_VERSION };
  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, "utf8") > MAX_CACHED_BYTES) return;
  try {
    await briefly(cache.set(messageCacheKey(input, modelId), serialized, MESSAGE_CACHE_TTL_SECONDS));
  } catch {
    /* Best effort; chat already succeeded. */
  }
}
