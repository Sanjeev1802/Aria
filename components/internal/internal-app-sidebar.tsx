"use client";

import Link from "next/link";
import {
  Activity,
  ExternalLink,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  Sparkles,
} from "lucide-react";
import { AriaMark } from "@/components/aria-mark";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { InternalNavUser } from "./internal-nav-user";
import { type InternalRole } from "./internal-operator-role";
import { internalSectionLabel, type InternalSection } from "./internal-section";

const platformSections: { id: InternalSection; icon: typeof LayoutDashboard }[] = [
  { id: "overview", icon: LayoutDashboard },
  { id: "customers", icon: Users },
  { id: "subscription", icon: Sparkles },
];

const governanceSections: { id: InternalSection; icon: typeof Activity }[] = [
  { id: "activity", icon: Activity },
  { id: "operations", icon: ShieldCheck },
];
/** Only super admins manage the team, so only they see the entry. */
const teamSection = { id: "team" as InternalSection, icon: UsersRound };

export function InternalAppSidebar({
  section,
  onSectionChange,
  operator,
  onSignOut,
}: {
  section: InternalSection;
  onSectionChange: (section: InternalSection) => void;
  operator?: { name: string; email: string; role: InternalRole };
  onSignOut: () => void | Promise<void>;
}) {
  const { setOpenMobile } = useSidebar();

  const go = (next: InternalSection) => {
    onSectionChange(next);
    setOpenMobile(false);
  };

  return (
    <Sidebar variant="inset" collapsible="icon" className="internal-app-sidebar">
      <SidebarHeader className="gap-3 p-3">
        <Link href="/internal/" className="flex h-11 items-center gap-3 rounded-lg px-2 text-sidebar-foreground">
          <AriaMark className="size-7 shrink-0" />
          <div className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-semibold tracking-wide">ARIA</span>
            <span className="text-[10px] uppercase tracking-[.18em] text-muted-foreground">Internal console</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {platformSections.map(item => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton isActive={section === item.id} tooltip={internalSectionLabel(item.id)} onClick={() => go(item.id)}>
                  <item.icon aria-hidden />
                  <span>{internalSectionLabel(item.id)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Governance</SidebarGroupLabel>
          <SidebarMenu>
            {(operator?.role === "super_admin" ? [...governanceSections, teamSection] : governanceSections).map(item => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton isActive={section === item.id} tooltip={internalSectionLabel(item.id)} onClick={() => go(item.id)}>
                  <item.icon aria-hidden />
                  <span>{internalSectionLabel(item.id)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Shortcuts</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={section === "settings"} tooltip="Settings" onClick={() => go("settings")}>
                <Settings aria-hidden />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <InternalNavUser operator={operator} onSectionChange={go} onSignOut={onSignOut} />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Return to ARIA">
              <a href="/chat/">
                <ExternalLink aria-hidden />
                <span>Return to ARIA</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
