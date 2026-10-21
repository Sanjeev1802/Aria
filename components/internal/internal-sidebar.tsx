"use client";

import { Activity, ExternalLink, LayoutDashboard, ShieldCheck, Users, Wallet } from "lucide-react";
import { AriaMark } from "@/components/aria-mark";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";

export const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "customers", label: "Customers", icon: Users },
  { id: "workspaces", label: "Workspaces", icon: LayoutDashboard },
  { id: "plans", label: "Plans & credits", icon: Wallet },
  { id: "activity", label: "Audit activity", icon: Activity },
  { id: "operations", label: "Operations", icon: ShieldCheck },
] as const;

export type InternalSection = (typeof sections)[number]["id"];

export function InternalSidebar({ section, onSectionChange }: {
  section: InternalSection; onSectionChange: (section: InternalSection) => void;
}) {
  const { setOpenMobile } = useSidebar();
  return <Sidebar variant="inset" collapsible="icon">
    <SidebarHeader className="p-3">
      <div className="flex h-11 items-center gap-3 rounded-lg px-2 text-sidebar-foreground">
        <AriaMark className="size-7 shrink-0" />
        <div className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
          <span className="font-semibold tracking-wide">ARIA</span>
          <span className="text-[10px] uppercase tracking-[.18em] text-muted-foreground">Internal console</span>
        </div>
      </div>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarMenu>
          {sections.map(item => <SidebarMenuItem key={item.id}>
            <SidebarMenuButton isActive={section === item.id} tooltip={item.label}
              onClick={() => { onSectionChange(item.id); setOpenMobile(false); }}>
              <item.icon /><span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>)}
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter className="p-3">
      <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        <ShieldCheck className="size-4" /> Restricted operator access
      </div>
      <SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild tooltip="Return to ARIA">
        <a href="/chat/"><ExternalLink /><span>Return to ARIA</span></a>
      </SidebarMenuButton></SidebarMenuItem></SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>;
}
