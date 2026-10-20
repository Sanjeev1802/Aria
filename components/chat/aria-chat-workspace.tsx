"use client";

import { AriaChatAppSidebar } from "@/components/chat/aria-chat-app-sidebar";
import { AriaChatView } from "@/components/chat/aria-chat-view";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { ChatMessage, Conversation } from "@/lib/chat-preview";
import type { CSSProperties, ReactNode } from "react";

export type AriaChatWorkspaceProps = {
  conversations: Conversation[];
  activeId: string | null;
  title: string;
  messages: ChatMessage[];
  filter: string;
  isRunning: boolean;
  thinking: boolean;
  onFilterChange: (value: string) => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onSend: (text: string) => void | Promise<void>;
  onCancel: () => void;
  onDeleteMessage?: (id: string) => void;
  footer?: ReactNode;
};

/** Prompt-kit chat workspace: sidebar + scrollable messages + docked composer. */
export function AriaChatWorkspace({
  conversations,
  activeId,
  title,
  messages,
  filter,
  isRunning,
  thinking,
  onFilterChange,
  onSelectConversation,
  onNewChat,
  onSend,
  onCancel,
  onDeleteMessage,
  footer,
}: AriaChatWorkspaceProps) {
  return (
    <SidebarProvider
      className="flex min-h-svh w-full"
      style={{ "--sidebar-width": "16rem" } as CSSProperties}
    >
      <AriaChatAppSidebar
        conversations={conversations}
        activeId={activeId}
        filter={filter}
        onFilterChange={onFilterChange}
        onSelectConversation={onSelectConversation}
        onNewChat={onNewChat}
      />
      <SidebarInset className="min-h-0 p-0">
        <AriaChatView
          title={title}
          messages={messages}
          isRunning={isRunning}
          thinking={thinking}
          onSend={onSend}
          onCancel={onCancel}
          onDeleteMessage={onDeleteMessage}
        />
        {footer}
      </SidebarInset>
    </SidebarProvider>
  );
}

/** Alias aligned with prompt-kit FullChatApp export name. */
export { AriaChatWorkspace as FullChatApp };
