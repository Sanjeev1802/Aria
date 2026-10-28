import { createHash } from "node:crypto";
import type { ChatInput } from "./chat-input";
import type { Rates, Usage } from "./metering";
import type { StreamProvider } from "./chat-service";
import { ARIA_SYSTEM_PROMPT } from "./system-prompt";

export const LOCAL_TEST_RATE_VERSION = "local-test-v1";
export const LOCAL_TEST_RATES: Rates = { input: 0.06, output: 0.24, version: LOCAL_TEST_RATE_VERSION };

export function localTestModelConfig(_model: ChatInput["model"]) {
  return {
    id: "aria/local-test-nova",
    rates: LOCAL_TEST_RATES,
  };
}

function tokenEstimate(text: string) {
  return Math.max(1, Math.ceil(Buffer.byteLength(text, "utf8") / 4));
}

/**
 * Deterministic streaming model for local development. Never calls AWS; usage is
 * derived from message and response sizes so ledger settlement is predictable.
 */
export const streamFakeModel: StreamProvider = async function* (input, modelId, signal, request) {
  const lastUser = [...input.messages].reverse().find(m => m.role === "user")?.content.map(part => part.text).join("\n") ?? "";
  const digest = createHash("sha256").update(`${modelId}\0${lastUser}`).digest("hex").slice(0, 8);
  const response = `ARIA local demo · echo ${digest}: ${lastUser.slice(0, 240)}`;
  for (const word of response.split(" ")) {
    signal.throwIfAborted();
    yield { text: `${word} ` };
  }
  const inputTokens = tokenEstimate(JSON.stringify(input.messages) + ARIA_SYSTEM_PROMPT + request.runtimeContext);
  const outputTokens = tokenEstimate(response);
  yield { usage: { inputTokens, outputTokens } satisfies Usage };
};
