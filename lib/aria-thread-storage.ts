import type { ChatStorage } from "@openuidev/react-headless";
import { ariaFetch } from "./aria-session";

async function request(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await ariaFetch(path, init);
  } catch {
    throw new Error("Couldn't reach ARIA. Check your connection and try again.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Chat history is unavailable.");
  return body;
}

/** OpenUI's default storage is memory-only; this adapter stores the selected user's threads on ARIA. */
export function createAriaThreadStorage(selectedProjectId: () => string | null): ChatStorage {
  return {
  thread: {
    async listThreads() { return request("/api/threads/"); },
    async createThread(firstMessage) {
      return request("/api/threads/", { method: "POST", body: JSON.stringify({ firstMessage, projectId: selectedProjectId() ?? undefined }) });
    },
    async getMessages(id) {
      const result = await request(`/api/threads/${id}/`);
      return result.messages;
    },
    async updateThread(thread) {
      return request(`/api/threads/${thread.id}/`, { method: "PATCH", body: JSON.stringify({ title: thread.title }) });
    },
    async deleteThread(id) {
      await request(`/api/threads/${id}/`, { method: "DELETE" });
    },
  },
  };
}
