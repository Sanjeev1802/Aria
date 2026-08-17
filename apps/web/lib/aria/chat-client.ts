import { loadProfile, type ProfileData } from "@/lib/aria/profile";
import { loadSettings, type SettingsData } from "@/lib/aria/settings";
import { estimateTokens } from "@/lib/aria/tokens";
import type { ChatMessage } from "@/lib/aria/types";

export type AssistantReplyResult = {
  content: string;
  completionTokens: number;
  promptTokens?: number;
  model?: string;
  sources?: { title: string; url: string }[];
  grounded?: boolean;
};

type RequestChatOptions = {
  messages: Pick<ChatMessage, "role" | "content">[];
  settings?: Partial<SettingsData>;
  profile?: Partial<ProfileData>;
};

function clientTimeline() {
  return {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    now: new Date().toISOString(),
  };
}

export async function requestAssistantReply(
  options: RequestChatOptions,
): Promise<AssistantReplyResult> {
  const settings = options.settings ?? loadSettings();
  const profile = options.profile ?? loadProfile();
  const timeline = clientTimeline();

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: options.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      settings,
      profile,
      timeZone: timeline.timeZone,
      now: timeline.now,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    content?: string;
    completionTokens?: number;
    promptTokens?: number;
    model?: string;
    sources?: { title?: string; url?: string }[];
    grounded?: boolean;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || `Chat request failed (${response.status})`);
  }

  const content = data.content?.trim();
  if (!content) {
    throw new Error("Empty response from ARIA");
  }

  const sources = (data.sources ?? [])
    .filter((s): s is { title: string; url: string } =>
      Boolean(s?.url && typeof s.url === "string"),
    )
    .map((s) => ({
      title: typeof s.title === "string" && s.title.trim() ? s.title : s.url,
      url: s.url,
    }));

  return {
    content,
    completionTokens: data.completionTokens ?? estimateTokens(content),
    promptTokens: data.promptTokens,
    model: data.model,
    sources,
    grounded: Boolean(data.grounded || sources.length),
  };
}
