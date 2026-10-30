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
  LifeBuoy,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutConfirmDialog } from "@/components/auth/sign-out-confirm-dialog";
import { ariaSignOut } from "@/lib/aria-session";

export type AriaOpenUISidebarUserProps = {
  name: string;
  email?: string;
  avatar?: string;
  onWorkspaceNavigate?: (path: AriaWorkspacePath) => void;
  activeWorkspacePath?: string;
  /** Header avatar sits in the thread chrome; sidebar is the collapsed rail only. */
  placement?: "sidebar" | "header";
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
}: {
  name: string;
  avatar: string;
  size?: "md" | "sm";
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
  placement = "sidebar",
}: AriaOpenUISidebarUserProps) {
  const go = (path: AriaWorkspacePath) => {
    setOpen(false);
    onWorkspaceNavigate?.(path);
  };
  const collapsed = useSidebarCollapsed();
  const [open, setOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const router = useRouter();
  const isHeader = placement === "header";

  const handleSignOut = async () => {
    setSignOutPending(true);
    try {
      await ariaSignOut();
      router.push("/sign-in/");
    } finally {
      setSignOutPending(false);
      setSignOutOpen(false);
    }
  };

  return (
    <>
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div
        className={isHeader ? "aria-openui-account" : "aria-openui-sidebar-user"}
        data-settings-active={activeWorkspacePath === "settings" ? "true" : undefined}
        data-menu-open={open ? "true" : undefined}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={isHeader ? "aria-openui-account__trigger" : "aria-openui-sidebar-user__trigger"}
            aria-label={`Account, ${name}`}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => {
              if (!isHeader) openAriaOpenUISidebar();
            }}
          >
            <SidebarUserAvatar name={name} avatar={avatar} />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="aria-openui-sidebar-user-menu"
          side={isHeader ? "bottom" : collapsed ? "right" : "top"}
          align="end"
          sideOffset={isHeader ? 8 : collapsed ? 10 : 8}
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
            onSelect={() => {
              setOpen(false);
              router.push("/pricing/");
            }}
          >
            <Sparkles size={18} strokeWidth={1.75} aria-hidden />
            Upgrade plan
          </DropdownMenuItem>

          <DropdownMenuSeparator className="aria-openui-sidebar-user-menu__sep" />

          <DropdownMenuItem
            className="aria-openui-sidebar-user-menu__item"
            onSelect={() => {
              setOpen(false);
              router.push("/help/");
            }}
          >
            <LifeBuoy size={18} strokeWidth={1.75} aria-hidden />
            Help
          </DropdownMenuItem>
          <DropdownMenuItem
            className="aria-openui-sidebar-user-menu__item"
            onSelect={() => setSignOutOpen(true)}
          >
            <LogOut size={18} strokeWidth={1.75} aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
    <SignOutConfirmDialog
      open={signOutOpen}
      onOpenChange={setSignOutOpen}
      onConfirm={handleSignOut}
      pending={signOutPending}
    />
    </>
  );
}
