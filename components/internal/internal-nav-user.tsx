"use client";

import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { internalRoleLabel, type InternalRole } from "./internal-operator-role";
import type { InternalSection } from "./internal-section";

export function InternalNavUser({
  operator,
  onSectionChange,
  onSignOut,
}: {
  operator?: { name: string; email: string; role: InternalRole };
  onSectionChange: (section: InternalSection) => void;
  onSignOut: () => void | Promise<void>;
}) {
  const { isMobile, state: sidebarState } = useSidebar();
  const collapsed = sidebarState === "collapsed";
  const name = operator?.name || "Operator";
  const email = operator?.email || "";
  const initials = name.slice(0, 1).toUpperCase();
  const roleLabel = operator?.role ? internalRoleLabel(operator.role) : "Staff";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="internal-operator data-[state=open]:bg-sidebar-accent">
              <Avatar className="internal-operator-avatar size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="internal-operator-details grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{name}</span>
                <span className="internal-operator-role truncate text-xs">{roleLabel}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="internal-operator-menu w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg ring-0"
            side={isMobile ? "bottom" : collapsed ? "right" : "top"}
            align={collapsed ? "end" : "start"}
            sideOffset={collapsed ? 10 : 8}
            collisionPadding={16}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSectionChange("profile")}>
              <UserRound className="size-4" aria-hidden />
              Your profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => void onSignOut()}
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
