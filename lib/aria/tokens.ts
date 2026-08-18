import type { ChatAttachment, MessageTokenUsage } from "./types";
import { getPlan, loadPlanId } from "./plans";

/** Soft monthly budget — follows the active subscription plan. */
export function getTokenLimit() {
  if (typeof window === "undefined") return 100_000;
  return getPlan(loadPlanId()).tokenLimit;
}

/** @deprecated Prefer getTokenLimit() — kept for imports that expect a constant */
export const TOKEN_LIMIT = 100_000;

/** Rough estimate: ~4 chars ≈ 1 token (+ file overhead). */
export function estimateTokens(text: string, attachments: ChatAttachment[] = []) {
  const textTokens = Math.max(1, Math.ceil(text.trim().length / 4));
  const fileTokens = attachments.reduce((sum, file) => {
    const base = Math.ceil(file.size / 1024);
    return sum + Math.max(8, base);
  }, 0);
  return textTokens + fileTokens;
}

export function buildTokenUsage(
  promptTokens: number,
  completionTokens: number,
): MessageTokenUsage {
  return {
    prompt: promptTokens,
    completion: completionTokens,
    total: promptTokens + completionTokens,
  };
}

export function formatTokenCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const USAGE_KEY = "aria.workspace.token-usage.v1";

export type TokenUsageState = {
  used: number;
  limit: number;
  updatedAt: number;
};

export function loadTokenUsage(): TokenUsageState {
  const limit = getTokenLimit();
  if (typeof window === "undefined") {
    return { used: 0, limit, updatedAt: Date.now() };
  }
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { used: 0, limit, updatedAt: Date.now() };
    const parsed = JSON.parse(raw) as TokenUsageState;
    return {
      used: typeof parsed.used === "number" ? parsed.used : 0,
      limit,
      updatedAt: parsed.updatedAt ?? Date.now(),
    };
  } catch {
    return { used: 0, limit, updatedAt: Date.now() };
  }
}

export function saveTokenUsage(state: TokenUsageState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    USAGE_KEY,
    JSON.stringify({ ...state, limit: getTokenLimit() }),
  );
}

export function resetTokenUsage() {
  saveTokenUsage({ used: 0, limit: getTokenLimit(), updatedAt: Date.now() });
}

export function conversationTokenTotal(
  messages: { tokens?: MessageTokenUsage }[],
) {
  return messages.reduce((sum, m) => sum + (m.tokens?.total ?? 0), 0);
}
