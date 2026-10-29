import test from "node:test";
import assert from "node:assert/strict";
import { parseChatInput } from "../lib/server/chat-input";
import { builtinReply } from "../lib/server/builtin-replies";
import { createChatResponse, type StreamProvider } from "../lib/server/chat-service";
import { identity, ledgerEnv, sse } from "./helpers";
import type { Account } from "../lib/server/accounting/credit-ledger";

function turn(text: string) {
  return parseChatInput({ runId: "builtin_1", messages: [{ role: "user", content: text }] });
}

test("greetings and identity questions match built-in ARIA copy", () => {
  assert.match(builtinReply(turn("hi")) ?? "", /Hello/);
  assert.match(builtinReply(turn("Hello!")) ?? "", /Hello/);
  assert.match(builtinReply(turn("who are you")) ?? "", /ARIA/);
  assert.match(builtinReply(turn("What can you do?")) ?? "", /draft/);
  assert.equal(builtinReply(turn("hi, write a business plan")), undefined);
  assert.equal(builtinReply(turn("Who is the CEO of Microsoft?")), undefined);
});

test("built-in replies stream without calling the model or charging credits", async () => {
  const env = ledgerEnv();
  const user = await env.directory.ensureAccount(identity("alice"));
  const account: Account = { workspaceId: user.personalWorkspaceId, memberId: "alice", plan: "free" };
  await env.ledger.ensurePeriodGrant(account.workspaceId, "free");
  let modelCalls = 0;
  const provider: StreamProvider = async function* () {
    modelCalls++;
    yield { text: "from the model" };
    yield { usage: { inputTokens: 10, outputTokens: 10 } };
  };
  const before = await env.ledger.balance(account.workspaceId);
  const events = await sse(await createChatResponse(turn("who are you"), {
    ledger: env.ledger, account, modelId: "claude-haiku-5-5",
    rates: { input: 0.1, output: 0.5, version: "test" }, provider,
    signal: new AbortController().signal, maxOutputTokens: 1024,
  }));
  const lang = events.filter(e => e.type === "TEXT_MESSAGE_CONTENT").map(e => e.delta).join("");
  assert.match(lang, /I'm ARIA/);
  assert.doesNotMatch(lang, /from the model/);
  assert.equal(modelCalls, 0);
  assert.equal((await env.ledger.balance(account.workspaceId)).used, before.used);
});
