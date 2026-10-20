/** True when the desktop sidebar is in the narrow (icon) rail layout. */
export function isAriaOpenUISidebarCollapsed() {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(
      ".aria-openui-chat .openui-agent-container:not(.openui-agent-container--mobile) .openui-agent-sidebar-container--collapsed",
    ),
  );
}

/** Opens the desktop sidebar via OpenUI’s header toggle (no-op when already expanded). */
export function openAriaOpenUISidebar() {
  if (typeof document === "undefined" || !isAriaOpenUISidebarCollapsed()) return;
  const toggle = document.querySelector(
    ".aria-openui-chat .openui-agent-sidebar-header__toggle-button",
  ) as HTMLButtonElement | null;
  toggle?.click();
}
