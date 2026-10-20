import type { Conversation } from "@/lib/chat-preview";

export type ConversationPeriodGroup = {
  period: string;
  conversations: Conversation[];
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function periodLabel(updatedAt: number, now: Date): string {
  const today = startOfDay(now);
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;
  const monthAgo = today - 30 * 86400000;

  if (updatedAt >= today) return "Today";
  if (updatedAt >= yesterday) return "Yesterday";
  if (updatedAt >= weekAgo) return "Last 7 days";
  if (updatedAt >= monthAgo) return "Last month";
  return "Older";
}

export function groupConversationsByPeriod(conversations: Conversation[]): ConversationPeriodGroup[] {
  const now = new Date();
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const map = new Map<string, Conversation[]>();

  for (const c of sorted) {
    const period = periodLabel(c.updatedAt, now);
    const list = map.get(period) ?? [];
    list.push(c);
    map.set(period, list);
  }

  const order = ["Today", "Yesterday", "Last 7 days", "Last month", "Older"];
  return order
    .filter((period) => map.has(period))
    .map((period) => ({ period, conversations: map.get(period)! }));
}
