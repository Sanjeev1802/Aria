"use client";

import { AriaOpenUISidebarHistory } from "@/components/chat/aria-openui-sidebar-history";
import { openAriaOpenUISidebar } from "@/lib/aria-openui-sidebar-open";
import { useThreadList } from "@openuidev/react-headless";
import { LibraryBig, SquarePen } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "library", label: "Library", icon: LibraryBig, path: "library" as const },
] as const;

export type AriaOpenUISidebarNavProps = {
  activePath?: string;
  onNavigate?: (path: string | undefined) => void;
};

export function AriaOpenUISidebarNav({ activePath, onNavigate }: AriaOpenUISidebarNavProps) {
  const switchToNewThread = useThreadList((s) => s.switchToNewThread);
  const goNewChat = () => {
    openAriaOpenUISidebar();
    switchToNewThread();
    onNavigate?.(undefined);
  };

  const goWorkspace = (path: (typeof NAV_ITEMS)[number]["path"]) => {
    openAriaOpenUISidebar();
    onNavigate?.(path);
  };

  return (
    <nav className="aria-openui-sidebar-nav" aria-label="Chat navigation">
      <ul className="aria-openui-sidebar-nav__stack">
        <li>
          <button
            type="button"
            className="aria-openui-sidebar-icon-btn"
            aria-label="New chat"
            title="New chat"
            onClick={goNewChat}
          >
            <SquarePen size={18} strokeWidth={1.75} aria-hidden />
            <span className="aria-openui-sidebar-nav__item-label">New chat</span>
          </button>
        </li>

        {NAV_ITEMS.map(({ id, label, icon: Icon, path }) => {
          const active = activePath === path;
          return (
            <li key={id}>
              <button
                type="button"
                className={cn(
                  "aria-openui-sidebar-icon-btn",
                  active && "aria-openui-sidebar-icon-btn--active",
                )}
                aria-label={label}
                title={label}
                aria-current={active ? "page" : undefined}
                onClick={() => goWorkspace(path)}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden />
                <span className="aria-openui-sidebar-nav__item-label">{label}</span>
              </button>
            </li>
          );
        })}

        <li className="aria-openui-sidebar-nav__history-item">
          <AriaOpenUISidebarHistory onLeaveRoute={() => onNavigate?.(undefined)} />
        </li>
      </ul>
    </nav>
  );
}
