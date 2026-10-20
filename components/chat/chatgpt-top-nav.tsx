"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

/** Mobile-only bar to open the left sidebar. */
export function ChatGptTopNav() {
  const { isMobile } = useSidebar();

  if (!isMobile) return null;

  return (
    <header className="cgpt-topnav cgpt-topnav--mobile-only">
      <SidebarTrigger
        className="cgpt-topnav-menu size-9 shrink-0"
        aria-label="Open sidebar"
      />
    </header>
  );
}
