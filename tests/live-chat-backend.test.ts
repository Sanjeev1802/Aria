import test from "node:test";
import assert from "node:assert/strict";
import { routeLiveChat } from "../lib/server/live-chat-backend";
import { chargeUnits } from "../lib/server/metering";
import { parseChatInput } from "../lib/server/chat-input";
import type { ChatDeps } from "../lib/server/handlers";

test("a configured Anthropic account does not route Free Nova requests to Claude", async () => {
  const calls: string[] = [];
  const backend = (name: string, inputRate: number, outputRate: number): Pick<ChatDeps, "provider" | "modelConfig"> => ({
    modelConfig: () => ({ id: name, rates: { input: inputRate, output: outputRate, version: "test" } }),
    provider: async function* () {
      calls.push(name);
      yield { text: name };
      yield { usage: { inputTokens: 100, outputTokens: 10 } };
    },
  });
  const deps = routeLiveChat({
    bedrock: backend("nova", 0.035, 0.14),
    anthropic: backend("claude", 3, 15),
    anthropicAvailable: true,
    maxOutputTokens: 1024,
  });
  const input = parseChatInput({ runId: "free_search_request", model: "nova", messages: [{ role: "user", content: "Who is the Chief Minister of Tamil Nadu?" }] });
  const selected = deps.modelConfig(input.model);
  const held = chargeUnits({ inputTokens: 20_000, outputTokens: deps.maxOutputTokens }, selected.rates);
  assert.equal(selected.id, "nova");
  assert.ok(held < 200_000, "a Free request must fit its 200-credit allowance");
  for await (const _ of deps.provider(input, selected.id, new AbortController().signal)) { /* observe route */ }
  assert.deepEqual(calls, ["nova"]);

  assert.equal(deps.modelConfig("claude").id, "claude");
});
