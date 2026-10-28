"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AriaWorkspacePath } from "@/lib/aria-workspace-paths";
import { openAriaOpenUISidebar } from "@/lib/aria-openui-sidebar-open";
import {
  ChevronRight,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ariaSignOut, useAriaSession } from "@/lib/aria-session";

export type AriaOpenUISidebarUserProps = {
  name: string;
  email?: string;
  avatar?: string;
  onWorkspaceNavigate?: (path: AriaWorkspacePath) => void;
  activeWorkspacePath?: string;
};

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SidebarUserAvatar({
  name,
  avatar,
  size = "md",
  variant = "initials",
}: {
  name: string;
  avatar: string;
  size?: "md" | "sm";
  variant?: "initials" | "icon";
}) {
  const initials = initialsFromName(name);
  return (
    <div
      className={
        size === "sm"
          ? "aria-openui-sidebar-user__avatar aria-openui-sidebar-user__avatar--sm"
          : "aria-openui-sidebar-user__avatar"
      }
      role="img"
      aria-label={name}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-provided avatar URL
        <img src={avatar} alt="" className="aria-openui-sidebar-user__avatar-img" />
      ) : variant === "icon" ? (
        <UserRound
          className="aria-openui-sidebar-user__avatar-icon"
          size={size === "sm" ? 14 : 16}
          strokeWidth={2}
          aria-hidden
        />
      ) : (
        <span className="aria-openui-sidebar-user__avatar-initials" aria-hidden>
          {initials}
        </span>
      )}
    </div>
  );
}

function useSidebarCollapsed(): boolean {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const sidebar = document.querySelector(".openui-agent-sidebar-container");
    if (!sidebar) return;

    const read = () => {
      setCollapsed(sidebar.classList.contains("openui-agent-sidebar-container--collapsed"));
    };
    read();

    const observer = new MutationObserver(read);
    observer.observe(sidebar, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return collapsed;
}

export function AriaOpenUISidebarUser({
  name,
  email,
  avatar = "",
  onWorkspaceNavigate,
  activeWorkspacePath,
}: AriaOpenUISidebarUserProps) {
  const go = (path: AriaWorkspacePath) => {
    setOpen(false);
    onWorkspaceNavigate?.(path);
  };
  const collapsed = useSidebarCollapsed();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  // The server only sends `operator` to internal operators, so customers never see the entry.
  const isOperator = Boolean(useAriaSession().operator);

  const triggerBody = (
    <>
      <SidebarUserAvatar
        name={name}
        avatar={avatar}
        variant={collapsed ? "icon" : "initials"}
      />
      <div className="aria-openui-sidebar-user__text">
        <span className="aria-openui-sidebar-user__name">{name}</span>
        {email ? <span className="aria-openui-sidebar-user__email">{email}</span> : null}
      </div>
    </>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div
        className="aria-openui-sidebar-user"
        data-settings-active={activeWorkspacePath === "settings" ? "true" : undefined}
        data-menu-open={open ? "true" : undefined}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="aria-openui-sidebar-user__trigger"
            aria-label={`Account menu, ${name}`}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => openAriaOpenUISidebar()}
          >
            {triggerBody}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="aria-openui-sidebar-user-menu"
          side={collapsed ? "right" : "top"}
          align={collapsed ? "end" : "start"}
          sideOffset={collapsed ? 10 : 8}
          collisionPadding={16}
        >
          <DropdownMenuItem
            className="aria-openui-sidebar-user-menu__header"
            onSelect={() => go("settings")}
          >
            <SidebarUserAvatar name={name} avatar={avatar} size="sm" />
            <span className="aria-openui-sidebar-user-menu__header-text">
              <span className="aria-openui-sidebar-user-menu__header-name">{name}</span>
              {email ? (
                <span className="aria-openui-sidebar-user-menu__header-meta">{email}</span>
              ) : null}
            </span>
            <ChevronRight className="aria-openui-sidebar-user-menu__chevron" aria-hidden />
          </DropdownMenuItem>

          <DropdownMenuSeparator className="aria-openui-sidebar-user-menu__sep" />

          <DropdownMenuItem
            className="aria-openui-sidebar-user-menu__item"
            onSelect={() => go("pricing")}
          >
            <Sparkles size={18} strokeWidth={1.75} aria-hidden />
            Upgrade plan
          </DropdownMenuItem>
          <DropdownMenuItem
            className="aria-openui-sidebar-user-menu__item"
            onSelect={() => go("settings")}
          >
            <UserRound size={18} strokeWidth={1.75} aria-hidden />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            className="aria-openui-sidebar-user-menu__item"
            onSelect={() => go("settings")}
          >
            <Settings size={18} strokeWidth={1.75} aria-hidden />
            Settings
          </DropdownMenuItem>

          <DropdownMenuSeparator className="aria-openui-sidebar-user-menu__sep" />

          {isOperator ? (
            <DropdownMenuItem
              className="aria-openui-sidebar-user-menu__item"
              onSelect={() => router.push("/internal/")}
            >
              <LayoutDashboard size={18} strokeWidth={1.75} aria-hidden />
              Internal dashboard
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="aria-openui-sidebar-user-menu__item"
            onSelect={() => go("help")}
          >
            <LifeBuoy size={18} strokeWidth={1.75} aria-hidden />
            Help
          </DropdownMenuItem>
          <DropdownMenuItem
            className="aria-openui-sidebar-user-menu__item"
            onSelect={() => {
              void ariaSignOut().finally(() => router.push("/sign-in/"));
            }}
          >
            <LogOut size={18} strokeWidth={1.75} aria-hidden />
            Log out everywhere
          </DropdownMenuItem>
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}
