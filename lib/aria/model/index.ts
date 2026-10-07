/**
 * ARIA model layer.
 *
 * Everything that decides how ARIA thinks and speaks lives here:
 *   config.ts   — model selection and generation parameters
 *   client.ts   — provider router (Anthropic or Bedrock)
 *   prompt/     — one module per system-prompt section
 *
 * The rest of the app talks to ARIA only through this barrel.
 */
export { generateAriaReply } from "./client";
export type {
  AriaReply,
  ChatTurn,
  GroundingSource,
  SearchStatus,
} from "./client";
export {
  clearGroundingCooldown,
  isGroundingCoolingDown,
  messageNeedsLiveSearch,
} from "./search";
export {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_BEDROCK_MODEL,
  generationDefaults,
  getModelName,
  getModelProvider,
  isLiveSearchEnabled,
  requireApiKey,
  requireModelCredentials,
} from "./config";
export type { ModelProvider } from "./config";
export { buildPromptSections, buildSystemPrompt } from "./prompt";
export type {
  DynamicSectionBuilder,
  PromptContext,
  PromptSection,
  StaticSectionBuilder,
} from "./types";
