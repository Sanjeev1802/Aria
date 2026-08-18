"use client";

import { useMemo, useState } from "react";
import type { Conversation } from "@/lib/aria/types";
import { AriaLogo } from "@/components/chat/AriaLogo";
import { ConfirmDialog } from "@/components/chat/ConfirmDialog";
import { TokenUsageBar } from "@/components/chat/TokenUsageBar";
import { AccountMenu } from "@/components/account/AccountMenu";
import {
  MessageSquareIcon,
  PanelLeftCloseIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

type AriaSidebarProps = {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  conversations: Conversation[];
  activeId: string | null;
  tokenUsed: number;
  tokenLimit: number;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
};

export function AriaSidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
  conversations,
  activeId,
  tokenUsed,
  tokenLimit,
  onSelect,
  onNewChat,
  onDeleteChat,
}: AriaSidebarProps) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  const deleteTarget = conversations.find((c) => c.id === deleteId) ?? null;

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/25 lg:hidden"
          aria-label="Close sidebar"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`
          z-50 flex shrink-0 flex-col overflow-hidden
          border border-foreground/10 bg-card
          transition-[width,transform] duration-200
          max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:h-dvh
          max-lg:w-[min(100%,16rem)] max-lg:rounded-r-2xl max-lg:border-l-0
          sm:max-lg:inset-y-2 sm:max-lg:left-2 sm:max-lg:h-[calc(100dvh-1rem)]
          sm:max-lg:rounded-2xl sm:max-lg:border
          lg:relative lg:h-full lg:rounded-2xl
          ${collapsed ? "lg:w-14" : "lg:w-[240px]"}
          ${open ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"}
        `}
      >
        <div
          className={`flex h-12 items-center border-b border-foreground/10 ${
            collapsed ? "justify-center px-1.5" : "justify-between gap-1.5 px-2.5"
          }`}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden size-9 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-foreground/5 lg:inline-flex"
              aria-label="Open sidebar"
              title="Open sidebar"
            >
              <AriaLogo className="h-5 w-auto" />
            </button>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                <AriaLogo className="h-4 w-auto shrink-0 text-foreground" />
                <span className="truncate text-[11px] font-semibold tracking-[0.16em] text-foreground">
                  ARIA
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  className="hidden size-7 items-center justify-center rounded-lg text-foreground/45 transition-colors hover:bg-foreground/5 hover:text-foreground lg:inline-flex"
                  aria-label="Search chats"
                  onClick={() => setSearchOpen((v) => !v)}
                >
                  <SearchIcon className="size-3.5" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  className="hidden size-7 items-center justify-center rounded-lg text-foreground/45 transition-colors hover:bg-foreground/5 hover:text-foreground lg:inline-flex"
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  onClick={onToggleCollapse}
                >
                  <PanelLeftCloseIcon className="size-3.5" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  className="inline-flex size-7 items-center justify-center rounded-lg text-foreground/45 transition-colors hover:bg-foreground/5 hover:text-foreground lg:hidden"
                  onClick={onClose}
                  aria-label="Close menu"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        <div
          className={`flex flex-col gap-0.5 pt-2 ${
            collapsed ? "items-center px-1.5" : "px-2"
          }`}
        >
          <button
            type="button"
            className={`flex h-8 items-center rounded-lg bg-foreground/[0.07] text-[12px] font-medium text-foreground ${
              collapsed ? "w-9 justify-center" : "gap-2.5 px-2.5"
            }`}
            title="Chat"
          >
            <MessageSquareIcon className="size-3.5 shrink-0" strokeWidth={1.75} />
            {!collapsed ? <span>Chat</span> : null}
          </button>
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className={`flex h-8 items-center rounded-lg text-[12px] text-foreground/55 transition-colors hover:bg-foreground/5 hover:text-foreground ${
              collapsed ? "w-9 justify-center" : "gap-2.5 px-2.5"
            }`}
            title="New chat"
            aria-label="New chat"
          >
            <PencilIcon className="size-3.5 shrink-0" strokeWidth={1.75} />
            {!collapsed ? <span>New chat</span> : null}
          </button>
        </div>

        {!collapsed ? (
          <>
            {(searchOpen || query) && (
              <div className="px-2 pt-2">
                <div className="flex h-8 items-center gap-2 rounded-lg border border-foreground/10 bg-background px-2">
                  <SearchIcon className="size-3.5 text-foreground/35" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search chats…"
                    className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-foreground/35"
                    autoFocus
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="text-foreground/35 hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <XIcon className="size-3" />
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-2">
              <p className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/35">
                Recents
              </p>
              {filtered.length === 0 ? (
                <p className="px-2 text-[12px] text-foreground/35">
                  {query ? "No matching chats" : "No chats yet"}
                </p>
              ) : (
                <ul className="space-y-px">
                  {filtered.map((conversation) => (
                    <li key={conversation.id} className="group/item relative">
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(conversation.id);
                          onClose();
                        }}
                        className={`w-full truncate rounded-md py-1.5 pr-8 pl-2.5 text-left text-[12px] transition-colors ${
                          conversation.id === activeId
                            ? "bg-foreground/[0.07] text-foreground"
                            : "text-foreground/55 hover:bg-foreground/5 hover:text-foreground"
                        }`}
                      >
                        {conversation.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(conversation.id)}
                        className="absolute top-1/2 right-1 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-foreground/30 opacity-0 transition-opacity hover:bg-foreground/5 hover:text-red-700 group-hover/item:opacity-100"
                        aria-label={`Delete ${conversation.title}`}
                        title="Delete chat"
                      >
                        <Trash2Icon className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1" />
        )}

        <div
          className={`mt-auto border-t border-foreground/10 ${
            collapsed ? "px-2 py-2" : "px-2 pb-2 pt-2"
          }`}
        >
          <div className={collapsed ? "mb-2" : "mb-2"}>
            <TokenUsageBar
              used={tokenUsed}
              limit={tokenLimit}
              compact={collapsed}
              rail={collapsed}
            />
          </div>
          <AccountMenu collapsed={collapsed} onNavigate={onClose} />
        </div>
      </aside>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete this chat?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” will be removed from your recents. This can’t be undone.`
            : "This chat will be permanently removed."
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) onDeleteChat(deleteId);
          setDeleteId(null);
        }}
      />
    </>
  );
}
