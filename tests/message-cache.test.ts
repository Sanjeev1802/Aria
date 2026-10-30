import test from "node:test";
import assert from "node:assert/strict";
import { parseChatInput } from "../lib/server/chat-input";
import {
  MESSAGE_CACHE_TTL_SECONDS,
  messageCacheEligible,
  messageCacheKey,
  readMessageCache,
  writeMessageCache,
  type CachedMessagePayload,
} from "../lib/server/cache/message-cache";
import { createChatResponse, type StreamProvider } from "../lib/server/chat-service";
import { identity, ledgerEnv } from "./helpers";
import type { SearchCache } from "../lib/server/cache/search-cache";
import { PROMPT_VERSION } from "../lib/server/system-prompt";

test("message cache keys are opaque and entries expire after 30 days", async () => {
  const store = new Map<string, { value: string; ttl: number }>();
  const cache: SearchCache = {
    get: async key => store.get(key)?.value ?? null,
    set: async (key, value, ttl) => { store.set(key, { value, ttl }); },
  };
  const input = parseChatInput({ runId: "cache_key_test", messages: [{ role: "user", content: "Explain photosynthesis briefly" }] });
  assert.ok(messageCacheEligible(input, {}));
  const key = messageCacheKey(input, "nova");
  assert.doesNotMatch(key, /photosynthesis/i);
  await writeMessageCache(cache, input, "nova", "Plants convert light to energy.");
  assert.equal(store.get(key)?.ttl, MESSAGE_CACHE_TTL_SECONDS);
  assert.equal(await readMessageCache(cache, input, "nova"), "Plants convert light to energy.");
});

test("repeat questions reuse cache without calling the model or charging credits", async () => {
  const env = ledgerEnv();
  const owner = await env.directory.ensureAccount(identity("owner"));
  const ws = owner.personalWorkspaceId;
  await env.ledger.ensurePeriodGrant(ws, "pro");
  const account = { workspaceId: ws, memberId: "owner", plan: "pro" as const };
  const entries = new Map<string, string>();
  const cache: SearchCache = {
    get: async key => entries.get(key) ?? null,
    set: async (key, value) => { entries.set(key, value); },
  };
  const input = parseChatInput({ runId: "cache_hit_1", messages: [{ role: "user", content: "What is JSON?" }] });
  const payload: CachedMessagePayload = { text: "JSON is a text format for structured data.", modelId: "m", promptVersion: PROMPT_VERSION };
  entries.set(messageCacheKey(input, "m"), JSON.stringify(payload));
  let calls = 0;
  const provider: StreamProvider = async function* () { calls++; yield { text: "live" }; yield { usage: { inputTokens: 1, outputTokens: 1 } }; };
  const before = (await env.ledger.balance(ws)).used;
  await (await createChatResponse(input, {
    ledger: env.ledger, account, modelId: "m", rates: { input: 0.06, output: 0.24, version: "v" },
    provider, signal: new AbortController().signal, maxOutputTokens: 256, messageCache: cache,
  })).text();
  assert.equal(calls, 0);
  assert.equal((await env.ledger.balance(ws)).used, before);
});

test("multi-turn threads cache on the latest user message", () => {
  const input = parseChatInput({
    runId: "cache_thread",
    messages: [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
      { role: "user", content: "What is JSON?" },
    ],
  });
  assert.equal(messageCacheEligible(input, {}), true);
  assert.equal(messageCacheEligible(input, { nativeSearch: true }), true);
});
