"use client";

import Link from "next/link";
import {
  Archive,
  Compass,
  LibraryBig,
  Search,
  SquarePen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChatGptRailProps = {
  onNewChat: () => void;
  onSearch: () => void;
  onLibrary: () => void;
  className?: string;
};

export function ChatGptRail({ onNewChat, onSearch, onLibrary, className }: ChatGptRailProps) {
  return (
    <nav className={cn("cgpt-rail", className)} aria-label="Primary">
      <div className="cgpt-rail-top">
        <button type="button" className="cgpt-rail-btn" aria-label="New chat" onClick={onNewChat}>
          <SquarePen size={20} strokeWidth={1.75} />
        </button>
        <button type="button" className="cgpt-rail-btn" aria-label="Search chats" onClick={onSearch}>
          <Search size={20} strokeWidth={1.75} />
        </button>
        <Link href="/" className="cgpt-rail-btn cgpt-rail-link" aria-label="Explore ARIA home">
          <Compass size={20} strokeWidth={1.75} />
        </Link>
        <button type="button" className="cgpt-rail-btn" aria-label="Chat history" onClick={onLibrary}>
          <LibraryBig size={20} strokeWidth={1.75} />
        </button>
        <button type="button" className="cgpt-rail-btn" aria-label="Archived chats" disabled title="Preview">
          <Archive size={20} strokeWidth={1.75} />
        </button>
      </div>
      <div className="cgpt-rail-bottom">
        <span className="cgpt-rail-avatar" aria-hidden>
          G
        </span>
      </div>
    </nav>
  );
}
