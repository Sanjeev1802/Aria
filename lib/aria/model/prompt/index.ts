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

/**
 * Nova Micro carries a baked-in Amazon identity. This line sits outside the
 * tagged sections so it is the first instruction the model sees.
 */
const IDENTITY_OVERRIDE = `You are ARIA, BNII's intelligence interface — not Amazon Nova, not Amazon Bedrock, not an Amazon product. Never say you were built by Amazon, by inventors, or by any model vendor. Never mention Nova, Bedrock, a training cut-off, or close with "feel free to ask".`;

/** The complete system instruction sent with a chat request. */
export function buildSystemPrompt(promptContext: PromptContext = {}) {
  return `${IDENTITY_OVERRIDE}\n\n${renderSections(buildPromptSections(promptContext))}`;
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
