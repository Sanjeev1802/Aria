"use client";

import { SettingsModalAppearancePanel } from "@/components/account/aria-settings-modal-appearance-panel";
import {
  SettingsModalAccountPanel,
  SettingsModalBillingPanel,
  SettingsModalDataPanel,
  SettingsModalPrivacyPanel,
} from "@/components/account/aria-settings-modal-panels";
import { SettingsModalUsagePanel } from "@/components/account/aria-settings-usage-panel";
import { SettingsModalTeamPanel } from "@/components/account/aria-settings-modal-team-panel";
import { AriaWorkspaceOverlay } from "@/components/workspace/aria-workspace-overlay";
import { useAriaSession } from "@/lib/aria-session";
import {
  SETTINGS_MODAL_PATHS,
  type AriaSettingsModalSection,
} from "@/lib/aria-settings-modal-sections";
import { cn } from "@/lib/utils";
import { useNav } from "@openuidev/react-ui";
import { ChevronDown, CreditCard, Database, Gauge, Palette, Shield, UserRound, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

type NavItem = {
  id: AriaSettingsModalSection;
  label: string;
  icon: LucideIcon;
};

const BASE_NAV: NavItem[] = [
  { id: "account", label: "Account", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "usage", label: "Usage", icon: Gauge },
  { id: "data", label: "Data controls", icon: Database },
];

const SECTION_TITLES: Record<AriaSettingsModalSection, string> = {
  account: "Account",
  appearance: "Appearance",
  team: "Team",
  privacy: "Privacy",
  billing: "Billing",
  usage: "Usage",
  data: "Data controls",
};

function panelForSection(section: AriaSettingsModalSection) {
  switch (section) {
    case "account":
      return <SettingsModalAccountPanel />;
    case "appearance":
      return <SettingsModalAppearancePanel />;
    case "team":
      return <SettingsModalTeamPanel />;
    case "privacy":
      return <SettingsModalPrivacyPanel />;
    case "billing":
      return <SettingsModalBillingPanel />;
    case "usage":
      return <SettingsModalUsagePanel />;
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
  if (preferredSection !== seenPreferred) {
    setSeenPreferred(preferredSection);
    setSelected(preferredSection);
  }

  const teamActive = useAriaSession().workspace?.plan === "team";
  const active = selected === "team" && !teamActive ? "account" : selected;

  const close = useCallback(() => {
    navigate(undefined);
  }, [navigate]);

  const selectSection = (section: AriaSettingsModalSection) => {
    setSelected(section);
    const nextPath = SETTINGS_MODAL_PATHS[section];
    if (path !== nextPath) navigate(nextPath);
  };

  const navItems = useMemo(() => {
    if (!teamActive) return BASE_NAV;
    const data = BASE_NAV.find((item) => item.id === "data");
    return [
      ...BASE_NAV.filter((item) => item.id !== "data"),
      { id: "team" as const, label: "Team", icon: Users },
      ...(data ? [data] : []),
    ];
  }, [teamActive]);

  return (
    <AriaWorkspaceOverlay label="Settings" onClose={close}>
      <div className="aria-settings-modal-card__grid">
        <aside className="aria-settings-modal-card__nav">
          <p className="aria-settings-modal-card__nav-label">Settings</p>
          <div className="aria-settings-modal-card__nav-mobile">
            <label htmlFor="aria-settings-section" className="sr-only">Settings section</label>
            <select
              id="aria-settings-section"
              value={active}
              onChange={(event) => selectSection(event.target.value as AriaSettingsModalSection)}
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            <ChevronDown className="aria-settings-modal-card__nav-chevron" size={16} aria-hidden />
          </div>
          <nav className="aria-settings-modal-card__nav-list" aria-label="Settings sections">
            <ul>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={cn(
                        "aria-settings-nav-item",
                        isActive && "aria-settings-nav-item--active",
                      )}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => selectSection(item.id)}
                    >
                      <Icon size={16} strokeWidth={1.75} aria-hidden />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="aria-settings-modal-card__main">
          <header className="aria-settings-modal-card__header">
            <h2 className="aria-settings-modal-card__title">{SECTION_TITLES[active]}</h2>
          </header>
          <div className="aria-settings-modal-card__body">
            {panelForSection(active)}
          </div>
        </div>
      </div>
    </AriaWorkspaceOverlay>
  );
}
