import test from "node:test";
import assert from "node:assert/strict";
import {
  claudeEffortFor,
  DEFAULT_ARIA_ATTENTION,
  parseAriaAttention,
} from "../lib/aria-attention";
import { parseChatInput } from "../lib/server/chat-input";

const body = (extra: Record<string, unknown> = {}) => ({
  runId: "request_123",
  messages: [{ role: "user", content: "Summarize this report" }],
  ...extra,
});

test("ARIA attention names map to Claude effort", () => {
  assert.equal(claudeEffortFor("glance"), "low");
  assert.equal(claudeEffortFor("think"), "medium");
  assert.equal(claudeEffortFor("know"), "high");
});

test("unknown attention falls back to Glance", () => {
  assert.equal(parseAriaAttention(undefined), DEFAULT_ARIA_ATTENTION);
  assert.equal(parseAriaAttention("max"), "glance");
  assert.equal(parseAriaAttention("low"), "glance");
});

test("parseChatInput accepts Glance Think Know and defaults missing values", () => {
  assert.equal(parseChatInput(body()).attention, "glance");
  assert.equal(parseChatInput(body({ attention: "think" })).attention, "think");
  assert.equal(parseChatInput(body({ attention: "know" })).attention, "know");
  assert.equal(parseChatInput(body({ attention: "high" })).attention, "glance");
});
