import type { ProfileData } from "@/lib/aria/profile";
import type { SettingsData } from "@/lib/aria/settings";
import { bullets, section } from "../format";
import type { PromptContext } from "../types";

function toneLine(settings?: Partial<SettingsData> | null) {
  switch (settings?.baseTone) {
    case "professional":
      return "Tone: tighter and more precise for board or buyer audiences — still spoken, never stiff.";
    case "friendly":
      return "Tone: warm and easy, like a teammate you trust.";
    case "direct":
      return "Tone: blunt and fast. Lead with the call, skip the runway.";
    default:
      return "Tone: natural and conversational — a sharp colleague, not a corporate voice.";
  }
}

function styleLines(settings?: Partial<SettingsData> | null) {
  return [
    settings?.warm && "Warm the delivery slightly.",
    settings?.enthusiastic &&
      "Show real conviction when the position or plan is strong.",
    settings?.headersAndLists === false
      ? "Prefer flowing prose. Avoid headings and bullet lists."
      : "Bullets are fine for genuine lists, but prose stays the default.",
    settings?.emoji
      ? "Light emoji is allowed when it adds clarity."
      : "Do not use emoji.",
    settings?.fastAnswers !== false &&
      "Lead with the answer or recommendation, then the reasoning.",
    settings?.language &&
      settings.language !== "English" &&
      `Respond in ${settings.language} unless asked otherwise.`,
  ];
}

function profileLines(profile?: Partial<ProfileData> | null) {
  if (!profile) return [];

  const identity = [profile.displayName, profile.jobTitle, profile.company]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" · ");

  return [
    identity && `You are speaking with: ${identity}.`,
    profile.bio?.trim() && `Their context: ${profile.bio.trim()}`,
    profile.preferredTone === "concise" && "They prefer short answers.",
    profile.preferredTone === "detailed" &&
      "They want fuller reasoning, risks, and caveats.",
  ];
}

export const userPrefs = (context: PromptContext) => {
  const custom = context.settings?.customInstructions?.trim();

  const body = [
    bullets([
      toneLine(context.settings),
      ...styleLines(context.settings),
      ...profileLines(context.profile),
    ]),
    custom &&
      `Custom instructions from the user (honour these unless they conflict with <rules>):\n${custom}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return section("user_prefs", body);
};
