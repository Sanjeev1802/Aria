"use client";

import Link from "next/link";
import { PlusIcon, Search } from "lucide-react";
import { NavUser } from "@/components/nav-user";
import { groupConversationsByPeriod } from "@/lib/group-conversations-by-period";
import type { Conversation } from "@/lib/chat-preview";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export type AriaChatAppSidebarProps = {
  conversations: Conversation[];
  activeId: string | null;
  filter: string;
  onFilterChange: (value: string) => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  className?: string;
};

const previewUser = {
  name: "Gokulakrishnan",
  email: "Free preview",
  avatar: "",
};

export function AriaChatAppSidebar({
  conversations,
  activeId,
  filter,
  onFilterChange,
  onSelectConversation,
  onNewChat,
  className,
}: AriaChatAppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(Boolean(filter.trim()));

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const groups = useMemo(() => groupConversationsByPeriod(conversations), [conversations]);

  return (
    <Sidebar className={cn("border-r border-sidebar-border", className)}>
      <SidebarHeader className="flex h-12 flex-row items-center justify-between gap-2 px-2 py-2">
        <Link
          href="/"
          className="text-foreground px-2 text-sm font-medium tracking-tight hover:opacity-80"
        >
          ARIA
        </Link>
        <Button
          type="button"
          variant="ghost"
          className="size-8"
          aria-label="Search chats"
          aria-pressed={searchOpen}
          onClick={() => setSearchOpen((v) => !v)}
        >
          <Search className="size-4" />
        </Button>
      </SidebarHeader>

      <SidebarContent className="pt-0">
        {searchOpen && (
          <div className="px-4 pb-2">
            <SidebarInput
              type="search"
              placeholder="Search chats…"
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
              aria-label="Search chats"
              autoFocus
            />
          </div>
        )}

        <div className="px-4">
          <Button
            type="button"
            variant="outline"
            className="mb-4 flex w-full items-center gap-2"
            onClick={() => {
              onNewChat();
              closeMobile();
            }}
          >
            <PlusIcon className="size-4" />
            <span>New Chat</span>
          </Button>
        </div>

        {groups.map((group) => (
          <SidebarGroup key={group.period}>
            <SidebarGroupLabel>{group.period}</SidebarGroupLabel>
            <SidebarMenu>
              {group.conversations.map((c) => (
                <SidebarMenuItem key={c.id}>
                  <SidebarMenuButton
                    isActive={c.id === activeId}
                    onClick={() => {
                      onSelectConversation(c.id);
                      closeMobile();
                    }}
                  >
                    <span className="truncate">{c.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}

        {!conversations.length && (
          <p className="text-muted-foreground px-4 py-2 text-xs">No chats yet</p>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <NavUser user={previewUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
