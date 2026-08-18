export type ChatRole = "user" | "assistant" | "system";

export type ChatAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  /** data URL for images / small files (local mock only) */
  dataUrl?: string;
};

export type MessageTokenUsage = {
  prompt: number;
  completion: number;
  total: number;
};

export type ChatSource = {
  title: string;
  url: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  attachments?: ChatAttachment[];
  tokens?: MessageTokenUsage;
  sources?: ChatSource[];
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

export function createId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function titleFromPrompt(prompt: string) {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (!cleaned) return "New chat";
  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned;
}
