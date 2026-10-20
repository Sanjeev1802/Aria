"use client";

import Link from "next/link";
import {
  LibraryBig,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SquarePen,
} from "lucide-react";
import { AriaMark } from "@/components/aria-mark";
import type { Conversation } from "@/lib/chat-preview";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type NavItem = {
  id: string;
  label: string;
  icon: typeof LibraryBig;
  disabled?: boolean;
  href?: string;
};

type ChatGptSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** When false, sidebar is not rendered (mobile drawer closed). */
  visible?: boolean;
  conversations: Conversation[];
  activeId: string | null;
  filter: string;
  onFilterChange: (value: string) => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
};

export function ChatGptSidebar({
  collapsed,
  onToggleCollapsed,
  visible = true,
  conversations,
  activeId,
  filter,
  onFilterChange,
  onSelect,
  onNewChat,
}: ChatGptSidebarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const q = filter.trim().toLowerCase();
  const recents = q
    ? conversations.filter((c) => c.title.toLowerCase().includes(q))
    : conversations;

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const navItems: NavItem[] = [{ id: "library", label: "Library", icon: LibraryBig, disabled: true }];

  if (!visible) return null;

  if (collapsed) {
    return (
      <aside className="cgpt-sidebar cgpt-sidebar--collapsed" aria-label="Sidebar">
        <div className="cgpt-sidebar-collapsed-top">
          <button type="button" className="cgpt-sidebar-icon-btn" aria-label="Open sidebar" onClick={onToggleCollapsed}>
            <PanelLeftOpen size={20} strokeWidth={1.75} />
          </button>
          <button type="button" className="cgpt-sidebar-icon-btn" aria-label="New chat" onClick={onNewChat}>
            <SquarePen size={20} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="cgpt-sidebar-icon-btn"
            aria-label="Search chats"
            onClick={() => {
              onToggleCollapsed();
              setSearchOpen(true);
            }}
          >
            <Search size={20} strokeWidth={1.75} />
          </button>
        </div>
        <div className="cgpt-sidebar-collapsed-bottom">
          <Link href="/sign-in/" className="cgpt-sidebar-user cgpt-sidebar-user--mini" aria-label="Account">
            <span className="cgpt-sidebar-avatar">G</span>
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="cgpt-sidebar" aria-label="Sidebar">
      <div className="cgpt-sidebar-header">
        <Link href="/" className="cgpt-sidebar-brand">
          <AriaMark className="cgpt-sidebar-mark" />
          <span>ARIA</span>
        </Link>
        <div className="cgpt-sidebar-header-actions">
          <button
            type="button"
            className="cgpt-sidebar-icon-btn"
            aria-label="Search chats"
            aria-pressed={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search size={18} strokeWidth={1.75} />
          </button>
          <button type="button" className="cgpt-sidebar-icon-btn" aria-label="Close sidebar" onClick={onToggleCollapsed}>
            <PanelLeftClose size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="cgpt-sidebar-search-wrap">
          <Search size={16} className="cgpt-sidebar-search-icon" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            className="cgpt-sidebar-search"
            placeholder="Search chats…"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            aria-label="Search chats"
          />
        </div>
      )}

      <button type="button" className="cgpt-sidebar-new-chat" onClick={onNewChat}>
        <SquarePen size={18} strokeWidth={1.75} />
        <span>New chat</span>
      </button>

      <nav className="cgpt-sidebar-nav" aria-label="Features">
        {navItems.map(({ id, label, icon: Icon, disabled, href }) => {
          const className = cn("cgpt-sidebar-nav-item", disabled && "is-disabled");
          if (href) {
            return (
              <Link key={id} href={href} className={className}>
                <Icon size={18} strokeWidth={1.75} />
                <span>{label}</span>
              </Link>
            );
          }
          return (
            <button key={id} type="button" className={className} disabled={disabled}>
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="cgpt-sidebar-section cgpt-sidebar-recents">
        <p className="cgpt-sidebar-section-label">Recents</p>
        <div className="cgpt-sidebar-recents-list">
          {recents.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn("cgpt-sidebar-recent", c.id === activeId && "is-active")}
              onClick={() => onSelect(c.id)}
              title={c.title}
            >
              {c.title}
            </button>
          ))}
          {!recents.length && (
            <p className="cgpt-sidebar-recents-empty">No chats yet</p>
          )}
        </div>
      </div>

      <Link href="/sign-in/" className="cgpt-sidebar-user">
        <span className="cgpt-sidebar-avatar">G</span>
        <span className="cgpt-sidebar-user-text">
          <span className="cgpt-sidebar-user-name">Gokulakrishnan</span>
          <span className="cgpt-sidebar-user-plan">Free preview</span>
        </span>
      </Link>
    </aside>
  );
}
