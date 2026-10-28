"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PLATFORM_SETTINGS_PAGE,
  buildInternalSettingsNav,
  resolveSettingsSectionMeta,
  type InternalSettingsSectionId,
} from "./internal-settings-sections";
import { InternalSettingsSectionPanel } from "./internal-settings-section-panels";
import { type InternalRole } from "./internal-operator-role";
import { InternalProfileHero } from "./internal-profile-hero";
import type { InternalColorScheme } from "./internal-theme-toggle";
import type { InternalSection } from "./internal-section";

export function InternalSettingsPage({
  operatorName,
  operatorEmail,
  operatorRole,
  colorScheme,
  onColorSchemeChange,
  onOpenProfile,
  onOpenAdmin,
  isSuperAdmin,
  initialSection,
  onViewAllActivity,
  onNavigatePlatform,
}: {
  operatorName: string;
  operatorEmail: string;
  operatorRole: InternalRole;
  colorScheme: InternalColorScheme;
  onColorSchemeChange: (scheme: InternalColorScheme) => void;
  onOpenProfile: () => void;
  onOpenAdmin?: () => void;
  isSuperAdmin?: boolean;
  initialSection?: InternalSettingsSectionId;
  onViewAllActivity?: () => void;
  onNavigatePlatform?: (section: InternalSection) => void;
}) {
  const superAdmin = Boolean(isSuperAdmin);
  const nav = buildInternalSettingsNav(superAdmin);
  const [section, setSection] = useState<InternalSettingsSectionId>(() => {
    if (initialSection && nav.some(item => item.id === initialSection)) return initialSection;
    return "general";
  });

  useEffect(() => {
    if (initialSection && nav.some(item => item.id === initialSection)) {
      setSection(initialSection);
    }
  }, [initialSection, nav]);

  const meta = resolveSettingsSectionMeta(section, superAdmin);

  return (
    <div
      className={`internal-operator-profile internal-settings-profile${superAdmin ? " internal-settings-profile--platform" : ""}`}
    >
      <aside
        className="internal-operator-profile__menu internal-settings-profile__menu internal-profile-nav-pop"
        aria-label={superAdmin ? "Platform settings categories" : "Settings sections"}
      >
        <div className="internal-platform-settings__sidebar-head">
          <p className="internal-platform-settings__sidebar-eyebrow">Internal console</p>
          <p className="internal-platform-settings__sidebar-title">Settings</p>
        </div>
        <nav className="internal-operator-profile__nav internal-settings-profile__nav">
          {nav.map(item => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`internal-operator-profile__nav-item${active ? " internal-operator-profile__nav-item--active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setSection(item.id)}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section
        className="internal-operator-profile__content internal-settings-profile__content"
        aria-labelledby="internal-settings-panel-title"
      >
        <div className="internal-settings-profile__body">
          {superAdmin ? (
            <header className="internal-platform-settings__page-head">
              <p className="internal-platform-settings__page-eyebrow">{PLATFORM_SETTINGS_PAGE.title}</p>
              <h1 id="internal-settings-panel-title" className="internal-platform-settings__page-title">
                {meta.title}
              </h1>
              <p className="internal-platform-settings__page-lede">{meta.description}</p>
            </header>
          ) : (
            <header className="internal-settings-section-header">
              <h2
                id="internal-settings-panel-title"
                className="internal-operator-profile__content-title internal-settings-section-header__title"
              >
                {meta.title}
              </h2>
              <p className="internal-settings-section-header__description">{meta.description}</p>
            </header>
          )}

          {!superAdmin && section === "general" ? (
            <InternalProfileHero name={operatorName} email={operatorEmail} role={operatorRole} />
          ) : null}

          <div className="internal-settings-profile__panel">
            <InternalSettingsSectionPanel
              section={section}
              operatorName={operatorName}
              operatorEmail={operatorEmail}
              operatorRole={operatorRole}
              colorScheme={colorScheme}
              onColorSchemeChange={onColorSchemeChange}
              isSuperAdmin={superAdmin}
              onOpenProfile={onOpenProfile}
              onOpenAdmin={onOpenAdmin}
              onViewAllActivity={onViewAllActivity}
              onNavigatePlatform={onNavigatePlatform}
            />
          </div>

          {!superAdmin ? (
            <div className="internal-operator-profile__footer">
              <p className="internal-operator-profile__footer-hint">
                Theme and sidebar layout are saved in this browser. Permissions come from the server.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
