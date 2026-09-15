import type { Conversation } from "./types";

async function parseJson(response: Response) {
  return (await response.json().catch(() => ({}))) as {
    error?: string;
    conversations?: Conversation[];
    conversation?: Conversation;
  };
}

async function authHeaders(getIdToken: () => Promise<string | null>) {
  const token = await getIdToken();
  if (!token) {
    throw new Error("Sign in required.");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function listConversations(
  getIdToken: () => Promise<string | null>,
): Promise<Conversation[]> {
  const response = await fetch("/api/conversations", {
    headers: await authHeaders(getIdToken),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data.error || "Unable to load conversations.");
  }
  return data.conversations ?? [];
}

export async function createConversation(
  getIdToken: () => Promise<string | null>,
  title = "New chat",
): Promise<Conversation> {
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: await authHeaders(getIdToken),
    body: JSON.stringify({ title }),
  });
  const data = await parseJson(response);
  if (!response.ok || !data.conversation) {
    throw new Error(data.error || "Unable to create a conversation.");
  }
  return { ...data.conversation, messages: data.conversation.messages ?? [] };
}

export async function getConversation(
  getIdToken: () => Promise<string | null>,
  id: string,
): Promise<Conversation> {
  const response = await fetch(`/api/conversations/${id}`, {
    headers: await authHeaders(getIdToken),
  });
  const data = await parseJson(response);
  if (!response.ok || !data.conversation) {
    throw new Error(data.error || "Unable to load this conversation.");
  }
  return data.conversation;
}

export async function deleteConversation(
  getIdToken: () => Promise<string | null>,
  id: string,
) {
  const response = await fetch(`/api/conversations/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getIdToken),
  });
  if (!response.ok) {
    const data = await parseJson(response);
    throw new Error(data.error || "Unable to delete this conversation.");
  }
}
