/**
 * ARIA model layer.
 *
 * Everything that decides how ARIA thinks and speaks lives here:
 *   config.ts   — model selection and generation parameters
 *   client.ts   — the provider call and grounding extraction
 *   prompt/     — one module per system-prompt section
 *
 * The rest of the app talks to ARIA only through this barrel.
 */
export { generateAriaReply } from "./client";
export type { AriaReply, ChatTurn, GroundingSource } from "./client";
export {
  DEFAULT_MODEL,
  generationDefaults,
  getModelName,
  isLiveSearchEnabled,
  requireApiKey,
} from "./config";
export { buildPromptSections, buildSystemPrompt } from "./prompt";
export type {
  DynamicSectionBuilder,
  PromptContext,
  PromptSection,
  StaticSectionBuilder,
} from "./types";
