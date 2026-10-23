import test from "node:test";
import assert from "node:assert/strict";
import { chargeUnits } from "../lib/server/metering";
import { parseChatInput } from "../lib/server/chat-input";
import { createChatResponse, type ProviderRequest, type StreamProvider } from "../lib/server/chat-service";
import { withFallback } from "../lib/server/provider-fallback";
import { claudeModelConfig, DEFAULT_CLAUDE_MODEL } from "../lib/server/anthropic";
import type { Account } from "../lib/server/accounting/credit-ledger";
import { identity, ledgerEnv } from "./helpers";

const claudeRates = { input: 4, output: 20, version: "claude" };
const novaRates = { input: 0.035, output: 0.14, version: "nova" };
const request: ProviderRequest = { runtimeContext: "# Session context", maxOutputTokens: 256 };
const input = (id = "run_fb_1") => parseChatInput({ runId: id, messages: [{ role: "user", content: "Hello" }] });

const nova: StreamProvider = async function* () {
  yield { text: "from nova" };
  yield { usage: { inputTokens: 100, outputTokens: 10 } };
};
const backup = { provider: nova, config: () => ({ id: "apac.amazon.nova-micro-v1:0", rates: novaRates }) };

async function collect(provider: StreamProvider, signal = new AbortController().signal) {
  const events = [];
  for await (const event of provider(input(), "claude-test", signal, request)) events.push(event);
  return events;
}

test("Nova answers when Claude fails before any text, and reports the model that served", async () => {
  const failing: StreamProvider = async function* () { throw Object.assign(new Error("overloaded"), { status: 529 }); };
  const events = await collect(withFallback(failing, backup));
  assert.deepEqual(events[0], { text: "from nova" });
  assert.deepEqual(events[1], { usage: { inputTokens: 100, outputTokens: 10 },
    servedBy: { modelId: "apac.amazon.nova-micro-v1:0", rates: novaRates } });
});

test("no fallback once Claude has streamed text, or when the user cancelled", async () => {
  const midStream: StreamProvider = async function* () { yield { text: "partial" }; throw new Error("connection reset"); };
  await assert.rejects(collect(withFallback(midStream, backup)), /connection reset/);
  const controller = new AbortController();
  const aborted: StreamProvider = async function* () { controller.abort(); throw new Error("aborted"); };
  await assert.rejects(collect(withFallback(aborted, backup), controller.signal), /aborted/);
});

test("a fallback answer is billed at Nova's rates, not the reserved Claude rates", async () => {
  const env = ledgerEnv();
  const user = await env.directory.ensureAccount(identity("alice"));
  const account: Account = { workspaceId: user.personalWorkspaceId, memberId: "alice", plan: "free" };
  await env.ledger.ensurePeriodGrant(account.workspaceId, "free");
  const failing: StreamProvider = async function* () { throw new Error("claude down"); };
  const before = (await env.ledger.balance(account.workspaceId)).used;
  const body = await (await createChatResponse(input("run_fb_bill"), { ledger: env.ledger, account, modelId: "claude-opus-5-5",
    rates: { ...claudeRates, input: 0.06, output: 0.24 }, provider: withFallback(failing, backup),
    signal: new AbortController().signal, maxOutputTokens: 256 })).text();
  assert.match(body, /from nova/);
  const used = (await env.ledger.balance(account.workspaceId)).used - before;
  assert.equal(Math.round(used * 1000), chargeUnits({ inputTokens: 100, outputTokens: 10 }, novaRates));
});

test("Claude model config defaults to Opus 5.5 list prices and honours overrides", () => {
  assert.deepEqual(claudeModelConfig({}).rates, { input: 4, output: 20, version: `anthropic-list-${DEFAULT_CLAUDE_MODEL}` });
  assert.equal(claudeModelConfig({ ANTHROPIC_MODEL_ID: "claude-haiku-5-5" }).rates.output, 0.5);
  assert.equal(claudeModelConfig({ ANTHROPIC_MODEL_ID: "custom", ANTHROPIC_INPUT_USD_PER_MILLION: "1",
    ANTHROPIC_OUTPUT_USD_PER_MILLION: "2" }).rates.input, 1);
  assert.throws(() => claudeModelConfig({ ANTHROPIC_MODEL_ID: "unknown-model" }), { code: "model_or_rates_not_configured" });
});

test("web search sources: only pages the answer cites, https only, deduplicated", async () => {
  const { extractWebSources } = await import("../lib/server/anthropic");
  const result = (n: number) => ({ type: "web_search_result", title: `Result ${n}`, url: `https://example.org/${n}`, page_age: null, encrypted_content: "x" });
  const content = [
    { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "q" } },
    { type: "web_search_tool_result", tool_use_id: "s1", content: [1, 2, 3, 4, 5, 6].map(result)
      .concat([{ ...result(7), url: "http://insecure.example/7" }, { ...result(8), url: "javascript:alert(1)" }]) },
    { type: "text", text: "Answer", citations: [
      { type: "web_search_result_location", url: "https://example.org/4", title: "Result 4", cited_text: "c", encrypted_index: "i" },
      { type: "web_search_result_location", url: "https://example.org/4", title: "Result 4", cited_text: "again", encrypted_index: "j" }] },
  ] as never[];
  assert.deepEqual(extractWebSources(content).map(s => s.url), ["https://example.org/4"], "only the page the answer cited, once");
  // Pages that were only seen in search results are not listed: a link the answer does not use would mislead.
  assert.deepEqual(extractWebSources(content.filter((block: { type: string }) => block.type !== "text")), []);
  // Insecure and script links are dropped even when cited.
  const unsafe = extractWebSources([{ type: "text", text: "x", citations: [
    { type: "web_search_result_location", url: "http://insecure.example/a", title: "a", cited_text: "c", encrypted_index: "i" },
    { type: "web_search_result_location", url: "javascript:alert(1)", title: "b", cited_text: "c", encrypted_index: "i" }] }] as never[]);
  assert.deepEqual(unsafe, []);
  // A failed search returns an error object instead of a list of results.
  const failed = extractWebSources([{ type: "web_search_tool_result", tool_use_id: "s2",
    content: { type: "web_search_tool_result_error", error_code: "unavailable" } }] as never[]);
  assert.deepEqual(failed, []);
});

test("Claude web search is billed per search, reserved up front, and never settles above the reservation", async () => {
  const env = ledgerEnv();
  const user = await env.directory.ensureAccount(identity("alice"));
  const account: Account = { workspaceId: user.personalWorkspaceId, memberId: "alice", plan: "free" };
  await env.ledger.ensurePeriodGrant(account.workspaceId, "free");
  const haikuRates = { input: 0.1, output: 0.5, version: "haiku" };
  const seen: ProviderRequest[] = [];
  const searching = (extraUnits: number): StreamProvider => async function* (_input, _model, _signal, req) {
    seen.push(req);
    yield { text: "Answer from the web." };
    yield { usage: { inputTokens: 5000, outputTokens: 100 }, extraUnits, sources: [{ title: "Example (report)", url: "https://example.org/a", snippet: "" }] };
  };
  const run = (id: string, provider: StreamProvider) => createChatResponse(input(id), { ledger: env.ledger, account, modelId: "claude-test",
    rates: haikuRates, provider, signal: new AbortController().signal, maxOutputTokens: 256, nativeSearch: { maxUses: 1 } });
  const before = (await env.ledger.balance(account.workspaceId)).used;
  const body = await (await run("run_search_bill_1", searching(30_000))).text();
  assert.match(body, /Web search results/);
  assert.match(body, /https:\/\/example\.org\/a/);
  assert.deepEqual(seen[0].webSearchTool, { maxUses: 1 }, "the provider is told it may search");
  assert.match(seen[0].runtimeContext, /Use it only for current or changing facts/);
  const used = (await env.ledger.balance(account.workspaceId)).used - before;
  assert.equal(Math.round(used * 1000), chargeUnits({ inputTokens: 5000, outputTokens: 100 }, haikuRates) + 30_000,
    "token charge plus the search fee");
  // A runaway fee is clamped to the reservation, so settlement still succeeds and nothing stays held.
  await (await run("run_search_clamp_1", searching(50_000_000))).text();
  const balance = await env.ledger.balance(account.workspaceId);
  assert.equal(balance.reserved, 0);
  assert.ok(balance.used < 200, "clamped to the reservation, never more than the plan holds");
});

test("when Claude fails, Nova answers without search and is told to say live results could not be checked", async () => {
  const failing: StreamProvider = async function* () { throw new Error("claude down"); };
  let seen: ProviderRequest | undefined;
  const spy: StreamProvider = async function* (_input, _model, _signal, req) { seen = req; yield { text: "no search" }; yield { usage: { inputTokens: 10, outputTokens: 2 } }; };
  const provider = withFallback(failing, { provider: spy, config: () => ({ id: "nova", rates: novaRates }) });
  const events = [];
  for await (const event of provider(input(), "claude-test", new AbortController().signal, { ...request, webSearchTool: { maxUses: 1 } })) events.push(event);
  assert.equal(events.length, 2);
  assert.equal(seen?.webSearchTool, undefined);
  assert.match(seen?.runtimeContext ?? "", /Web search failed for this message/);
});

test("Claude web search turns on with an Anthropic key, defaults to two searches, and respects the cap", async () => {
  const { readConfig } = await import("../lib/server/services");
  const env = (extra: Record<string, string>) => ({ NODE_ENV: "production", ...extra }) as unknown as NodeJS.ProcessEnv;
  assert.equal(readConfig(env({})).claudeWebSearchMaxUses, 0, "no key, no search");
  assert.equal(readConfig(env({ ANTHROPIC_API_KEY: "k" })).claudeWebSearchMaxUses, 2);
  assert.equal(readConfig(env({ ANTHROPIC_API_KEY: "k", ANTHROPIC_WEB_SEARCH_MAX_USES: "1" })).claudeWebSearchMaxUses, 1);
  assert.equal(readConfig(env({ ANTHROPIC_API_KEY: "k", ANTHROPIC_WEB_SEARCH_MAX_USES: "0" })).claudeWebSearchMaxUses, 0, "0 switches it off");
  for (const bad of ["9", "-1", "abc", "1.5"]) {
    assert.equal(readConfig(env({ ANTHROPIC_API_KEY: "k", ANTHROPIC_WEB_SEARCH_MAX_USES: bad })).claudeWebSearchMaxUses, 2, bad);
  }
  assert.equal(readConfig({ NODE_ENV: "development", ARIA_LOCAL_DEV: "true", ANTHROPIC_API_KEY: "k" } as unknown as NodeJS.ProcessEnv).claudeWebSearchMaxUses, 0,
    "the local demo uses the fake model");
});
