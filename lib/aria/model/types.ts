import type { ProfileData } from "@/lib/aria/profile";
import type { SettingsData } from "@/lib/aria/settings";

/**
 * Runtime context injected into the system prompt for a single request.
 * Static prompt modules never see this; only dynamic modules do.
 */
export type PromptContext = {
  settings?: Partial<SettingsData> | null;
  profile?: Partial<ProfileData> | null;
  /** IANA timezone reported by the client, e.g. "Asia/Kolkata". */
  timeZone?: string | null;
  /** ISO timestamp from the client. Falls back to server time. */
  now?: Date | string | null;
  /** Whether live web grounding is available for this request. */
  liveSearch?: boolean;
};

/** A single tagged block of the system prompt. */
export type PromptSection = {
  tag: string;
  body: string;
};

/** Static modules take no runtime input. */
export type StaticSectionBuilder = () => PromptSection;

/** Dynamic modules are rendered per request. */
export type DynamicSectionBuilder = (context: PromptContext) => PromptSection;

export type ChatTurn = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type GroundingSource = {
  title: string;
  url: string;
};

/** Why the reply did or did not use live web grounding. */
export type SearchStatus =
  | "used"
  | "not_needed"
  | "disabled"
  | "unavailable";

export type AriaReply = {
  content: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  sources: GroundingSource[];
  grounded: boolean;
  searchStatus: SearchStatus;
};
