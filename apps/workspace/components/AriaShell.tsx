"use client";

import { useEffect, useState, useTransition } from "react";
import type { Conversation } from "@/lib/aria/types";
import { createId, titleFromPrompt } from "@/lib/aria/types";
import {
  loadConversations,
  saveConversations,
} from "@/lib/aria/conversations";
import { mockAssistantReply } from "@/lib/aria/mock-reply";
import { AriaSidebar } from "@/components/AriaSidebar";
import { ChatEmptyState } from "@/components/ChatEmptyState";
import { ChatThread } from "@/components/ChatThread";
import { ChatComposer } from "@/components/ChatComposer";
import { MenuIcon, PencilIcon, ShareIcon } from "lucide-react";

export function AriaShell() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const stored = loadConversations();
    setConversations(stored);
    setActiveId(stored[0]?.id ?? null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveConversations(conversations);
  }, [conversations, hydrated]);

  const active =
    conversations.find((conversation) => conversation.id === activeId) ?? null;
  const isEmpty = !active || active.messages.length === 0;

  function createConversation(firstMessage?: string) {
    const id = createId("chat");
    const conversation: Conversation = {
      id,
      title: firstMessage ? titleFromPrompt(firstMessage) : "New chat",
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations((prev) => [conversation, ...prev]);
    setActiveId(id);
    return conversation;
  }

  function handleNewChat() {
    createConversation();
  }

  async function handleSend(content: string) {
    let conversation = active;
    if (!conversation) {
      conversation = createConversation(content);
    }

    const userMessage = {
      id: createId("msg"),
      role: "user" as const,
      content,
      createdAt: Date.now(),
    };

    startTransition(() => {
      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversation!.id
            ? {
                ...item,
                title:
                  item.messages.length === 0
                    ? titleFromPrompt(content)
                    : item.title,
                messages: [...item.messages, userMessage],
                updatedAt: Date.now(),
              }
            : item,
        ),
      );
    });

    setThinking(true);
    try {
      const reply = await mockAssistantReply(content);
      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversation!.id
            ? {
                ...item,
                messages: [
                  ...item.messages,
                  {
                    id: createId("msg"),
                    role: "assistant" as const,
                    content: reply,
                    createdAt: Date.now(),
                  },
                ],
                updatedAt: Date.now(),
              }
            : item,
        ),
      );
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="box-border flex h-dvh min-h-0 gap-0 overflow-hidden bg-[#050505] p-0 text-foreground sm:gap-1.5 sm:p-1.5">
      <AriaSidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={handleNewChat}
      />

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0 border-[#1c1c1c] bg-[#0a0a0a] sm:rounded-xl sm:border">
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#161616] px-2.5 sm:px-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex size-7 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-[#161616] hover:text-[#e5e5e5] lg:invisible lg:pointer-events-none"
            aria-label="Open menu"
          >
            <MenuIcon className="size-4" strokeWidth={1.75} />
          </button>

          <p className="absolute left-1/2 max-w-[40%] -translate-x-1/2 truncate text-center text-[12px] font-medium tracking-[-0.01em] text-[#a3a3a3]">
            {active?.title && active.messages.length > 0
              ? active.title
              : "New chat"}
          </p>

          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              className="inline-flex size-7 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-[#161616] hover:text-[#e5e5e5]"
              aria-label="Share"
            >
              <ShareIcon className="size-3.5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={handleNewChat}
              className="inline-flex size-7 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-[#161616] hover:text-[#e5e5e5]"
              aria-label="New chat"
            >
              <PencilIcon className="size-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {isEmpty ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col justify-center">
              <ChatEmptyState />
            </div>
            <ChatComposer disabled={thinking} onSend={handleSend} />
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ChatThread messages={active.messages} thinking={thinking} />
            </div>
            <ChatComposer disabled={thinking} onSend={handleSend} />
          </>
        )}
      </main>
    </div>
  );
}
