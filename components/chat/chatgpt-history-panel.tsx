"use client";

import { MessageSquarePlus, X } from "lucide-react";
import type { Conversation } from "@/lib/chat-preview";
import { cn } from "@/lib/utils";

type ChatGptHistoryPanelProps = {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  filter: string;
  onFilterChange: (value: string) => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
};

export function ChatGptHistoryPanel({
  open,
  onClose,
  conversations,
  activeId,
  filter,
  onFilterChange,
  onSelect,
  onNewChat,
}: ChatGptHistoryPanelProps) {
  const q = filter.trim().toLowerCase();
  const items = q ? conversations.filter((c) => c.title.toLowerCase().includes(q)) : conversations;

  if (!open) return null;

  return (
      <aside className={cn("cgpt-history-dock", open && "open")} aria-label="Chat history">
        <button
          type="button"
          className="cgpt-history-scrim md:hidden"
          aria-label="Close history"
          onClick={onClose}
        />
        <div className="cgpt-history-head">
          <h2>Chats</h2>
          <button type="button" className="cgpt-rail-btn" aria-label="Close sidebar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <button
          type="button"
          className="cgpt-history-new"
          onClick={() => {
            onNewChat();
            onClose();
          }}
        >
          <MessageSquarePlus size={16} />
          New chat
        </button>
        <input
          className="cgpt-history-search"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Search chats"
          aria-label="Search chats"
        />
        <div className="cgpt-history-list">
          {items.map((c) => (
            <button
              type="button"
              key={c.id}
              className={cn("cgpt-history-item", c.id === activeId && "active")}
              onClick={() => {
                onSelect(c.id);
                onClose();
              }}
            >
              <span className="cgpt-history-item-title">{c.title}</span>
              <span className="cgpt-history-item-meta">
                {c.mode === "intelligence" ? "Work" : "Chat"} · {c.model}
              </span>
            </button>
          ))}
          {!items.length && <p className="cgpt-history-empty">No chats yet. Start a new conversation.</p>}
        </div>
        <p className="cgpt-history-foot">Stored locally in your browser.</p>
      </aside>
  );
}
