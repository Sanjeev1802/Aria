"use client";

import { useAuth } from "@aria/auth";
import type { Conversation } from "@/lib/aria/types";
import { AriaLogo } from "@/components/AriaLogo";
import {
  MessageSquareIcon,
  PanelLeftIcon,
  PencilIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

type AriaSidebarProps = {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
};

export function AriaSidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
  conversations,
  activeId,
  onSelect,
  onNewChat,
}: AriaSidebarProps) {
  const { user, signOut } = useAuth();
  const initial = (user?.email?.[0] ?? "A").toUpperCase();
  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "Account";

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          aria-label="Close sidebar"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`
          z-50 flex shrink-0 flex-col overflow-hidden
          border border-[#1c1c1c] bg-[#0a0a0a]
          transition-[width,transform] duration-200
          max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:h-dvh
          max-lg:w-[min(100%,15.5rem)] max-lg:rounded-r-xl max-lg:border-l-0
          sm:max-lg:inset-y-1.5 sm:max-lg:left-1.5 sm:max-lg:h-[calc(100dvh-0.75rem)]
          sm:max-lg:rounded-xl sm:max-lg:border
          lg:relative lg:h-full lg:rounded-xl
          ${collapsed ? "lg:w-12" : "lg:w-[220px]"}
          ${open ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"}
        `}
      >
        <div className="flex h-11 items-center justify-between gap-1.5 border-b border-[#161616] px-2.5">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <AriaLogo className="h-4 w-auto shrink-0 text-[#f5f5f5]" />
            {!collapsed ? (
              <span className="truncate text-[11px] font-semibold tracking-[0.16em] text-[#f5f5f5]">
                ARIA
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {!collapsed ? (
              <button
                type="button"
                className="hidden size-6 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-[#161616] hover:text-[#e5e5e5] lg:inline-flex"
                aria-label="Search chats"
              >
                <SearchIcon className="size-3.5" strokeWidth={1.75} />
              </button>
            ) : null}
            <button
              type="button"
              className="hidden size-6 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-[#161616] hover:text-[#e5e5e5] lg:inline-flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={onToggleCollapse}
            >
              <PanelLeftIcon className="size-3.5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="inline-flex size-6 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-[#161616] hover:text-[#e5e5e5] lg:hidden"
              onClick={onClose}
              aria-label="Close menu"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 px-2 pt-2">
          <button
            type="button"
            className="flex h-8 items-center gap-2.5 rounded-lg bg-[#161616] px-2.5 text-[12px] font-medium text-[#f5f5f5]"
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
            className="flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[12px] text-[#a3a3a3] transition-colors hover:bg-[#121212] hover:text-[#f5f5f5]"
          >
            <PencilIcon className="size-3.5 shrink-0" strokeWidth={1.75} />
            {!collapsed ? <span>New chat</span> : null}
          </button>
        </div>

        {!collapsed ? (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-2">
            <p className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[#525252]">
              Recents
            </p>
            {conversations.length === 0 ? (
              <p className="px-2 text-[12px] text-[#404040]">No chats yet</p>
            ) : (
              <ul className="space-y-px">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(conversation.id);
                        onClose();
                      }}
                      className={`w-full truncate rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                        conversation.id === activeId
                          ? "bg-[#161616] text-[#f5f5f5]"
                          : "text-[#a3a3a3] hover:bg-[#121212] hover:text-[#e5e5e5]"
                      }`}
                    >
                      {conversation.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="mt-auto border-t border-[#161616] px-2 py-2">
          <button
            type="button"
            onClick={() => signOut()}
            className="flex h-8 w-full items-center gap-2 rounded-md px-1.5 text-left transition-colors hover:bg-[#121212]"
            title="Sign out"
          >
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1f1f1f] text-[11px] font-medium text-[#e5e5e5]">
              {initial}
            </div>
            {!collapsed ? (
              <span className="truncate text-[12px] font-medium text-[#e5e5e5]">
                {displayName}
              </span>
            ) : null}
          </button>
        </div>
      </aside>
    </>
  );
}
