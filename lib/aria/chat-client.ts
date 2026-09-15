import { loadProfile, type ProfileData } from "@/lib/aria/profile";
import { loadSettings, type SettingsData } from "@/lib/aria/settings";
import { estimateTokens } from "@/lib/aria/tokens";
import type { ChatMessage } from "@/lib/aria/types";
import { PUBLIC_CHAT_ERROR, sanitizePublicError } from "@/lib/aria/public-errors";

export type AssistantReplyResult = {
  content: string;
  completionTokens: number;
  promptTokens?: number;
  model?: string;
  sources?: { title: string; url: string }[];
  grounded?: boolean;
};

type RequestChatOptions = {
  conversationId: string;
  messages: Pick<ChatMessage, "role" | "content">[];
  settings?: Partial<SettingsData>;
  profile?: Partial<ProfileData>;
  getIdToken: () => Promise<string | null>;
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

  const token = await options.getIdToken();
  if (!token) {
    throw new Error("Sign in required.");
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      conversationId: options.conversationId,
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
    throw new Error(
      sanitizePublicError(data.error || PUBLIC_CHAT_ERROR.failed),
    );
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
    model: "aria",
    sources,
    grounded: Boolean(data.grounded || sources.length),
  };
}
