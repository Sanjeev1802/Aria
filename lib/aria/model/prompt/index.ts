import { renderSections } from "../format";
import type { PromptContext, PromptSection } from "../types";
import { behavior } from "./behavior";
import { context } from "./context";
import { examples } from "./examples";
import { identity } from "./identity";
import { mission } from "./mission";
import { output } from "./output";
import { rules } from "./rules";
import { runtime } from "./runtime";
import { tools } from "./tools";
import { userPrefs } from "./user-prefs";
import { voice } from "./voice";

/**
 * Identity and rules sit first so hard constraints are not buried. Remaining
 * static blocks stay cache-friendly (byte-identical every request). Per-request
 * context (`runtime`, `user_prefs`) goes last, closest to the conversation.
 */
const staticSections = [
  identity,
  rules,
  mission,
  context,
  voice,
  behavior,
  tools,
  output,
  examples,
];

const dynamicSections = [runtime, userPrefs];

export function buildPromptSections(
  promptContext: PromptContext = {},
): PromptSection[] {
  return [
    ...staticSections.map((build) => build()),
    ...dynamicSections.map((build) => build(promptContext)),
  ].filter((s) => s.body);
}

/** The complete system instruction sent with a chat request. */
export function buildSystemPrompt(promptContext: PromptContext = {}) {
  return renderSections(buildPromptSections(promptContext));
}

export {
  behavior,
  context,
  examples,
  identity,
  mission,
  output,
  rules,
  runtime,
  tools,
  userPrefs,
  voice,
};
