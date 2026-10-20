"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThreadList } from "@openuidev/react-headless";
import { History } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type AriaOpenUISidebarHistoryProps = {
  className?: string;
  onLeaveRoute?: () => void;
};

/** Collapsed-rail history picker (expanded sidebar uses Recents list). */
export function AriaOpenUISidebarHistory({
  className,
  onLeaveRoute,
}: AriaOpenUISidebarHistoryProps) {
  const threads = useThreadList((s) => s.threads);
  const isLoadingThreads = useThreadList((s) => s.isLoadingThreads);
  const selectThread = useThreadList((s) => s.selectThread);
  const selectedThreadId = useThreadList((s) => s.selectedThreadId);
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn("aria-openui-sidebar-icon-btn", className)}
          aria-label="Chat history"
          title="History"
        >
          <History size={18} strokeWidth={1.75} aria-hidden />
          <span className="aria-openui-sidebar-nav__item-label">History</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={8}
        className="aria-openui-sidebar-history-menu min-w-[12rem] border-border/60 bg-popover"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">Recent chats</DropdownMenuLabel>
        {threads.length === 0 ? (
          <div className="px-2 py-2 text-sm text-muted-foreground">
            {isLoadingThreads ? "Loading…" : "No chats yet"}
          </div>
        ) : (
          threads.map((thread) => (
            <DropdownMenuItem
              key={thread.id}
              className={cn(selectedThreadId === thread.id && "bg-accent")}
              onSelect={() => {
                selectThread(thread.id);
                onLeaveRoute?.();
              }}
            >
              <span className="truncate">{thread.title}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
