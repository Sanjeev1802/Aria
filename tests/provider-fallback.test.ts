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
