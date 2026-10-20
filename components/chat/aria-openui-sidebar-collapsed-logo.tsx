"use client";

import { AriaMark } from "@/components/aria-mark";
import { openAriaOpenUISidebar } from "@/lib/aria-openui-sidebar-open";

/** Shown in the sidebar header when collapsed; opens the full sidebar. */
export function AriaOpenUISidebarCollapsedLogo() {
  return (
    <button
      type="button"
      className="aria-openui-sidebar-logo aria-openui-sidebar-logo--expand"
      aria-label="ARIA, open sidebar"
      title="ARIA"
      onClick={openAriaOpenUISidebar}
    >
      <AriaMark className="aria-openui-sidebar-mark" aria-hidden />
    </button>
  );
}
