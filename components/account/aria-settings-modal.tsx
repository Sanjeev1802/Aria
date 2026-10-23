"use client";

import {
  SettingsModalAccountPanel,
  SettingsModalBillingPanel,
  SettingsModalDataPanel,
  SettingsModalPrivacyPanel,
} from "@/components/account/aria-settings-modal-panels";
import { SettingsModalTeamPanel } from "@/components/account/aria-settings-modal-team-panel";
import { useAriaSession } from "@/lib/aria-session";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SETTINGS_MODAL_PATHS,
  type AriaSettingsModalSection,
} from "@/lib/aria-settings-modal-sections";
import { cn } from "@/lib/utils";
import { useNav } from "@openuidev/react-ui";
import { ChevronDown, CreditCard, Database, Search, Shield, UserRound, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type NavItem = {
  id: AriaSettingsModalSection;
  label: string;
  group: "Settings" | "Workspace";
  icon: LucideIcon;
};

const BASE_NAV: NavItem[] = [
  { id: "account", label: "Account", group: "Settings", icon: UserRound },
  { id: "privacy", label: "Privacy", group: "Settings", icon: Shield },
  { id: "billing", label: "Billing", group: "Settings", icon: CreditCard },
  { id: "data", label: "Data controls", group: "Workspace", icon: Database },
];

const SECTION_TITLES: Record<AriaSettingsModalSection, string> = {
  account: "Account",
  team: "Team",
  privacy: "Privacy",
  billing: "Billing",
  data: "Data controls",
};

function panelForSection(section: AriaSettingsModalSection) {
  switch (section) {
    case "account":
      return <SettingsModalAccountPanel />;
    case "team":
      return <SettingsModalTeamPanel />;
    case "privacy":
      return <SettingsModalPrivacyPanel />;
    case "billing":
      return <SettingsModalBillingPanel />;
    case "data":
      return <SettingsModalDataPanel />;
  }
}

export type AriaSettingsModalProps = {
  preferredSection: AriaSettingsModalSection;
};

export function AriaSettingsModal({ preferredSection }: AriaSettingsModalProps) {
  const { navigate, path } = useNav();
  const [selected, setSelected] = useState(preferredSection);
  const [seenPreferred, setSeenPreferred] = useState(preferredSection);
  const [query, setQuery] = useState("");
  if (preferredSection !== seenPreferred) {
    setSeenPreferred(preferredSection);
    setSelected(preferredSection);
  }

  const teamActive = useAriaSession().workspace?.plan === "team";
  const active = selected === "team" && !teamActive ? "account" : selected;

  const close = useCallback(() => {
    navigate(undefined);
  }, [navigate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  const selectSection = (section: AriaSettingsModalSection) => {
    setSelected(section);
    const nextPath = SETTINGS_MODAL_PATHS[section];
    if (path !== nextPath) navigate(nextPath);
  };

  const navItems = useMemo(() => {
    if (!teamActive) return BASE_NAV;
    const teamItem: NavItem = { id: "team", label: "Team", group: "Workspace", icon: Users };
    return [
      BASE_NAV[0],
      BASE_NAV[1],
      BASE_NAV[2],
      teamItem,
      BASE_NAV[3],
    ];
  }, [teamActive]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navItems;
    return navItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [query, navItems]);

  const groups = useMemo(() => {
    const out: { group: NavItem["group"]; items: NavItem[] }[] = [];
    for (const item of filteredNav) {
      const last = out[out.length - 1];
      if (!last || last.group !== item.group) {
        out.push({ group: item.group, items: [item] });
      } else {
        last.items.push(item);
      }
    }
    return out;
  }, [filteredNav]);

  return (
    <div className="aria-settings-modal-overlay" role="presentation" onClick={close}>
      <Card
        className="aria-settings-modal-card relative z-[1] gap-0 overflow-hidden bg-card p-0 shadow-2xl ring-foreground/15"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <CardAction className="absolute top-2 right-2 z-10">
          <Button type="button" variant="ghost" size="icon-sm" className="size-10 md:size-7" aria-label="Close" onClick={close}>
            <X className="size-4" />
          </Button>
        </CardAction>

        <div className="aria-settings-modal-card__grid">
          <aside className="aria-settings-modal-card__nav flex flex-col gap-3 border-b border-border/60 bg-muted/40 p-3 pr-12 md:border-r md:border-b-0 md:pr-3">
            <div className="relative md:hidden">
              <label htmlFor="aria-settings-section" className="sr-only">Settings section</label>
              <select id="aria-settings-section" value={active}
                onChange={event => selectSection(event.target.value as AriaSettingsModalSection)}
                className="h-10 w-full appearance-none rounded-lg border border-border/70 bg-background/70 px-3 pr-9 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {navItems.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            </div>
            <div className="relative hidden shrink-0 md:block">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 pl-8"
                aria-label="Search settings"
              />
            </div>
            <div className="hidden min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 md:block">
              <nav className="flex flex-col gap-3" aria-label="Settings sections">
                {groups.map(({ group, items }) => (
                  <div key={group}>
                    <Label className="aria-settings-nav-group mb-1.5 px-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {group}
                    </Label>
                    <ul className="flex flex-col gap-0.5">
                      {items.map((item) => {
                        const Icon = item.icon;
                        return (
                        <li key={item.id}>
                          <Button
                            type="button"
                            variant={active === item.id ? "secondary" : "ghost"}
                            size="sm"
                            className={cn(
                              "h-8 w-full justify-start gap-2 font-normal",
                              active === item.id && "font-medium",
                            )}
                            aria-current={active === item.id ? "page" : undefined}
                            onClick={() => selectSection(item.id)}
                          >
                            <Icon className="size-4 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
                            {item.label}
                          </Button>
                        </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          <div className="aria-settings-modal-card__main">
            <CardHeader className="shrink-0 border-b border-border/60 pb-4">
              <CardTitle className="text-lg">{SECTION_TITLES[active]}</CardTitle>
              <CardDescription className="sr-only">
                {SECTION_TITLES[active]} settings for your ARIA workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 md:px-7">
              {panelForSection(active)}
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
}
