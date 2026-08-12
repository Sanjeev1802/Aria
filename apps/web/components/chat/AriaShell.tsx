"use client";

import { useEffect, useState, useTransition } from "react";
import type { Conversation } from "@/lib/aria/types";
import { createId, titleFromPrompt } from "@/lib/aria/types";
import {
  loadConversations,
  saveConversations,
} from "@/lib/aria/conversations";
import { mockAssistantReply } from "@/lib/aria/mock-reply";
import {
  buildTokenUsage,
  estimateTokens,
  getTokenLimit,
  loadTokenUsage,
  saveTokenUsage,
} from "@/lib/aria/tokens";
import { AriaSidebar } from "@/components/chat/AriaSidebar";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";
import { ChatThread } from "@/components/chat/ChatThread";
import {
  ChatComposer,
  type ComposerPayload,
} from "@/components/chat/ChatComposer";
import { TokenUsageBar } from "@/components/chat/TokenUsageBar";
import { ConfirmDialog } from "@/components/chat/ConfirmDialog";
import Link from "next/link";
import { MenuIcon, PencilIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { useAuth } from "@aria/auth";
import { ensureWorkspaceUser } from "@/lib/aria/users";

export function AriaShell() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [tokenUsed, setTokenUsed] = useState(0);
  const [tokenLimit, setTokenLimit] = useState(100_000);
  const [clearOpen, setClearOpen] = useState(false);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (user?.email) {
      ensureWorkspaceUser(user.email, user.displayName);
    }
  }, [user]);

  useEffect(() => {
    const stored = loadConversations();
    setConversations(stored);
    setActiveId(stored[0]?.id ?? null);
    const usage = loadTokenUsage();
    setTokenUsed(usage.used);
    setTokenLimit(getTokenLimit());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveConversations(conversations);
  }, [conversations, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveTokenUsage({
      used: tokenUsed,
      limit: tokenLimit,
      updatedAt: Date.now(),
    });
  }, [tokenUsed, tokenLimit, hydrated]);

  const active =
    conversations.find((conversation) => conversation.id === activeId) ?? null;
  const isEmpty = !active || active.messages.length === 0;
  const tokensRemaining = Math.max(0, tokenLimit - tokenUsed);

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
    setLimitNotice(null);
  }

  function handleDeleteChat(id: string) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeId === id) {
        setActiveId(next[0]?.id ?? null);
      }
      return next;
    });
  }

  function handleClearChat() {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((item) =>
        item.id === activeId
          ? { ...item, messages: [], title: "New chat", updatedAt: Date.now() }
          : item,
      ),
    );
    setClearOpen(false);
  }

  async function handleSend({ content, attachments }: ComposerPayload) {
    const promptTokens = estimateTokens(content, attachments);
    if (promptTokens > tokensRemaining) {
      setLimitNotice(
        "Token limit reached. Start a new period or clear older usage before sending.",
      );
      return;
    }

    let conversation = active;
    if (!conversation) {
      conversation = createConversation(content);
    }

    const userMessage = {
      id: createId("msg"),
      role: "user" as const,
      content,
      createdAt: Date.now(),
      attachments: attachments.length ? attachments : undefined,
      tokens: buildTokenUsage(promptTokens, 0),
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

    setTokenUsed((u) => u + promptTokens);
    setLimitNotice(null);
    setThinking(true);
    try {
      const reply = await mockAssistantReply(content);
      let completionTokens = reply.completionTokens;
      setTokenUsed((u) => {
        completionTokens = Math.min(
          reply.completionTokens,
          Math.max(0, tokenLimit - u),
        );
        return u + completionTokens;
      });
      const assistantTokens = buildTokenUsage(0, completionTokens);

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
                    content: reply.content,
                    createdAt: Date.now(),
                    tokens: assistantTokens,
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
    <div className="box-border flex h-dvh min-h-0 gap-0 overflow-hidden bg-background p-0 text-foreground sm:gap-2 sm:p-2">
      <AriaSidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        conversations={conversations}
        activeId={activeId}
        tokenUsed={tokenUsed}
        tokenLimit={tokenLimit}
        onSelect={setActiveId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0 border-foreground/10 bg-card sm:rounded-2xl sm:border">
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-foreground/10 px-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-foreground lg:invisible lg:pointer-events-none"
            aria-label="Open menu"
          >
            <MenuIcon className="size-4" strokeWidth={1.75} />
          </button>

          <p className="absolute left-1/2 max-w-[30%] -translate-x-1/2 truncate text-center text-[13px] font-medium tracking-[-0.01em] text-foreground/70">
            {active?.title && active.messages.length > 0
              ? active.title
              : "New chat"}
          </p>

          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/dashboard/plans"
              className="hidden h-7 items-center gap-1 rounded-full bg-foreground px-2.5 text-[11px] font-medium text-background transition-opacity hover:opacity-90 sm:inline-flex"
            >
              <SparklesIcon className="size-3" />
              Upgrade
            </Link>
            <div className="hidden w-[130px] md:block">
              <TokenUsageBar
                used={tokenUsed}
                limit={tokenLimit}
                compact
              />
            </div>
            {!isEmpty ? (
              <button
                type="button"
                onClick={() => setClearOpen(true)}
                className="inline-flex size-8 items-center justify-center rounded-lg text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-foreground"
                aria-label="Clear chat"
                title="Clear chat"
              >
                <Trash2Icon className="size-3.5" strokeWidth={1.75} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleNewChat}
              className="inline-flex size-8 items-center justify-center rounded-lg text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-foreground"
              aria-label="New chat"
              title="New chat"
            >
              <PencilIcon className="size-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        {limitNotice ? (
          <div className="border-b border-accent/30 bg-accent/10 px-3 py-2 text-center text-[12px] text-foreground/80">
            {limitNotice}
          </div>
        ) : null}

        {isEmpty ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col justify-center">
              <ChatEmptyState />
            </div>
            <ChatComposer
              disabled={thinking || tokensRemaining <= 0}
              tokensRemaining={tokensRemaining}
              onSend={handleSend}
            />
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ChatThread messages={active.messages} thinking={thinking} />
            </div>
            <ChatComposer
              disabled={thinking || tokensRemaining <= 0}
              tokensRemaining={tokensRemaining}
              onSend={handleSend}
            />
          </>
        )}
      </main>

      <ConfirmDialog
        open={clearOpen}
        title="Clear this chat?"
        description="All messages in the current conversation will be removed. Token usage for your workspace is kept."
        confirmLabel="Clear chat"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setClearOpen(false)}
        onConfirm={handleClearChat}
      />
    </div>
  );
}
