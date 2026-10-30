"use client";

import { useState } from "react";
import {
  CheckIcon,
  KeyRound,
  LogOutIcon,
  MinusIcon,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ARIA_IS_PREVIEW } from "@/lib/aria-session";
import { InternalSettingsGroup, InternalSettingsRow } from "./internal-settings-panel";
import {
  internalRoleCapabilities,
  internalRoleLabel,
  PRD_INTERNAL_ROLE_MATRIX,
  type InternalRole,
} from "./internal-operator-role";
import type { OperatorAuditEntry } from "./internal-operator-activity-list";
import { InternalProfileHero } from "./internal-profile-hero";
import { InternalReadonlyField } from "./internal-readonly-field";
import { InternalSettingsFormFooter, InternalSettingsPrototypeNotice } from "./internal-settings-ui";

type StaffProfileSection = "personal" | "login";
type SuperAdminProfileSection = "overview" | "personal" | "login";
type ProfileSection = StaffProfileSection | SuperAdminProfileSection;

function PermissionRow({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div className="internal-profile-permission">
      {allowed ? (
        <CheckIcon className="size-4 shrink-0" aria-hidden />
      ) : (
        <MinusIcon className="size-4 shrink-0 text-muted-foreground/45" aria-hidden />
      )}
      <span className={allowed ? undefined : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

const staffSectionTitle: Record<StaffProfileSection, string> = {
  personal: "Personal information",
  login: "Login & password",
};

const superSectionTitle: Record<SuperAdminProfileSection, string> = {
  overview: "Profile overview",
  personal: "Personal information",
  login: "Login & password",
};

const superSectionLede: Record<SuperAdminProfileSection, string> = {
  overview: "Operator identity snapshot — separate from platform settings.",
  personal: "Read-only identity fields from the Internal index and ARIA sign-in.",
  login: "Work email, password recovery, and assigned Internal permissions.",
};

const staffSectionLede: Record<StaffProfileSection, string> = {
  personal: "Your operator record in the Internal console.",
  login: "Sign-in path and permissions for your Internal role.",
};

export function InternalProfilePage({
  name,
  email,
  operatorId,
  role,
  myActivity,
  onViewAllActivity,
  onOpenPlatformSettings,
  onSignOut,
}: {
  name: string;
  email: string;
  operatorId: string;
  role: InternalRole;
  myActivity?: OperatorAuditEntry[];
  onViewAllActivity?: () => void;
  onOpenPlatformSettings?: () => void;
  onSignOut: () => void | Promise<void>;
}) {
  const isSuperAdmin = role === "super_admin";
  const [staffSection, setStaffSection] = useState<StaffProfileSection>("personal");
  const [superSection, setSuperSection] = useState<SuperAdminProfileSection>("overview");
  const [copied, setCopied] = useState(false);
  const caps = internalRoleCapabilities(role);
  const initials = (name || email || "?").slice(0, 1).toUpperCase();

  async function copyOperatorId() {
    try {
      await navigator.clipboard.writeText(operatorId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const staffNav: { id: StaffProfileSection | "logout"; label: string; icon: typeof UserRound }[] = [
    { id: "personal", label: "Personal information", icon: UserRound },
    { id: "login", label: "Login & password", icon: KeyRound },
    { id: "logout", label: "Sign out", icon: LogOutIcon },
  ];

  const superNav: { id: SuperAdminProfileSection | "logout"; label: string; icon: typeof UserRound }[] = [
    { id: "overview", label: "Overview", icon: UserRound },
    { id: "personal", label: "Personal information", icon: Sparkles },
    { id: "login", label: "Login & password", icon: KeyRound },
    { id: "logout", label: "Sign out", icon: LogOutIcon },
  ];

  function onStaffNav(id: StaffProfileSection | "logout") {
    if (id === "logout") {
      void onSignOut();
      return;
    }
    setStaffSection(id);
  }

  function onSuperNav(id: SuperAdminProfileSection | "logout") {
    if (id === "logout") {
      void onSignOut();
      return;
    }
    setSuperSection(id);
  }

  if (!isSuperAdmin) {
    const section = staffSection;
    const activeTitle = staffSectionTitle[section];
    return (
      <div className="internal-operator-profile internal-settings-profile">
        <aside
          className="internal-operator-profile__menu internal-settings-profile__menu internal-profile-nav-pop"
          aria-label="Profile sections"
        >
          <div className="internal-platform-settings__sidebar-head">
            <p className="internal-platform-settings__sidebar-eyebrow">Operator account</p>
            <p className="internal-platform-settings__sidebar-title">Your profile</p>
          </div>
          <nav className="internal-operator-profile__nav internal-settings-profile__nav">
            {staffNav.map(item => {
              const Icon = item.icon;
              const active = item.id !== "logout" && section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`internal-operator-profile__nav-item${active ? " internal-operator-profile__nav-item--active" : ""}${item.id === "logout" ? " internal-operator-profile__nav-item--logout" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onStaffNav(item.id)}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section
          className="internal-operator-profile__content internal-settings-profile__content"
          aria-labelledby="internal-profile-panel-title"
        >
          <div className="internal-settings-profile__body">
            <header className="internal-settings-section-header">
              <h1
                id="internal-profile-panel-title"
                className="internal-operator-profile__content-title internal-settings-section-header__title"
              >
                {activeTitle}
              </h1>
              <p className="internal-settings-section-header__description">{staffSectionLede[section]}</p>
            </header>
            <div className="internal-settings-profile__panel">
          {section === "personal" ? (
            <div className="internal-operator-profile__form">
              <InternalProfileHero name={name} email={email} role={role} />
              <div className="internal-operator-profile__form-row">
                <InternalReadonlyField label="Display name" value={name} />
                <InternalReadonlyField label="Internal role" value={internalRoleLabel(role)} />
              </div>
              <InternalReadonlyField label="Email address" value={email} verified />
              <InternalReadonlyField
                label="Operator ID"
                value={operatorId}
                mono
                trailing={
                  <Button type="button" variant="ghost" size="sm" className="internal-profile-field__copy h-8 shrink-0 px-2.5 text-xs" onClick={() => void copyOperatorId()}>
                    {copied ? "Copied" : "Copy"}
                  </Button>
                }
              />
              {myActivity && myActivity.length > 0 && onViewAllActivity ? (
                <button type="button" onClick={onViewAllActivity} className="internal-view-all text-sm font-medium">
                  View audit activity
                </button>
              ) : null}
            </div>
          ) : null}
          {section === "login" ? (
            <div className="internal-operator-profile__form">
              <InternalReadonlyField label="Work email" value={email} verified />
              <InternalReadonlyField label="Sign-in" value="ARIA identity (email + password)" wrap />
              <InternalSettingsGroup title="Password" className="internal-settings-group--flush">
                {ARIA_IS_PREVIEW ? (
                  <InternalSettingsRow label="Change password" hint="Not available in preview mode" />
                ) : (
                  <InternalSettingsRow label="Change password" hint="Opens in a new tab" href="/forgot-password/" openInNewTab />
                )}
              </InternalSettingsGroup>
              <div className="internal-operator-profile__permissions internal-operator-profile__permissions--spaced">
                <PermissionRow label="Inspect customers and workspaces" allowed={caps.inspect} />
                <PermissionRow label="Change plans and grant credits" allowed={caps.plansAndCredits} />
                <PermissionRow label={PRD_INTERNAL_ROLE_MATRIX[2]!.label} allowed={caps.accountControls} />
              </div>
            </div>
          ) : null}
          <p className="internal-operator-profile__hint">Your name and email come from ARIA sign-in, and your permissions come from the server.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const section = superSection;
  const activeTitle = superSectionTitle[section];

  return (
    <div className="internal-operator-profile internal-settings-profile internal-settings-profile--platform internal-super-admin-profile">
      <aside
        className="internal-operator-profile__menu internal-settings-profile__menu internal-profile-nav-pop"
        aria-label="Super admin profile"
      >
        <div className="internal-platform-settings__sidebar-head">
          <p className="internal-platform-settings__sidebar-eyebrow">Operator account</p>
          <p className="internal-platform-settings__sidebar-title">Your profile</p>
        </div>
        <nav className="internal-operator-profile__nav internal-settings-profile__nav">
          {superNav.map(item => {
            const Icon = item.icon;
            const active = item.id !== "logout" && section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`internal-operator-profile__nav-item${active ? " internal-operator-profile__nav-item--active" : ""}${item.id === "logout" ? " internal-operator-profile__nav-item--logout" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => onSuperNav(item.id)}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="internal-operator-profile__content internal-settings-profile__content" aria-labelledby="internal-profile-panel-title">
        <div className="internal-settings-profile__body">
          <header className="internal-platform-settings__page-head internal-super-admin-profile__head">
            <p className="internal-platform-settings__page-eyebrow">Super admin profile</p>
            <h1 id="internal-profile-panel-title" className="internal-platform-settings__page-title">
              {activeTitle}
            </h1>
            <p className="internal-platform-settings__page-lede">{superSectionLede[section]}</p>
          </header>

          <div className="internal-settings-profile__panel">
        {section === "overview" ? (
          <div className="internal-super-admin-profile__hero">
            <span className="internal-super-admin-profile__hero-avatar" aria-hidden>
              {initials}
            </span>
            <div className="internal-super-admin-profile__hero-copy">
              <p className="internal-super-admin-profile__hero-name">{name}</p>
              <p className="internal-super-admin-profile__hero-email">{email}</p>
              <div className="internal-super-admin-profile__hero-badges">
                <Badge>Super admin</Badge>
                <Badge variant="secondary">Active</Badge>
              </div>
            </div>
            <Button type="button" variant="outline" className="shadow-none" disabled title="Identity is managed through ARIA sign-in">
              Edit profile
            </Button>
          </div>
        ) : null}

        {section === "overview" ? (
          <div className="internal-super-admin-profile__overview-meta">
            <div className="internal-operator-profile__form-row">
              <InternalReadonlyField label="Account status" value="Active" />
              <InternalReadonlyField label="Account created" value="Not exposed in Internal console" wrap />
              <InternalReadonlyField label="Organization" value="ARIA Internal operators" wrap />
            </div>
            {onOpenPlatformSettings ? (
              <div className="internal-super-admin-profile__overview-actions">
                <Button type="button" className="shadow-none" onClick={onOpenPlatformSettings}>
                  Open platform settings
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {section === "personal" ? (
          <div className="internal-operator-profile__form">
            <div className="internal-operator-profile__form-row">
              <InternalReadonlyField label="Full name" value={name} />
              <InternalReadonlyField label="Email address" value={email} verified />
              <InternalReadonlyField label="Internal role" value="Super admin" />
              <InternalReadonlyField label="Phone number" value="Not stored in Internal console" />
              <InternalReadonlyField label="Job title" value="—" />
              <InternalReadonlyField label="Department" value="—" />
              <InternalReadonlyField label="Organization" value="ARIA Internal operators" wrap />
            </div>
            <InternalReadonlyField
              label="Operator ID"
              value={operatorId}
              mono
              trailing={
                <Button type="button" variant="ghost" size="sm" className="internal-profile-field__copy h-8 shrink-0 px-2.5 text-xs" onClick={() => void copyOperatorId()}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              }
            />
            {myActivity && myActivity.length > 0 && onViewAllActivity ? (
              <button type="button" onClick={onViewAllActivity} className="internal-view-all text-sm font-medium">
                View audit activity
              </button>
            ) : null}
            <InternalSettingsPrototypeNotice>
              Personal fields are read-only here. Update display name through ARIA identity when self-service profile editing ships.
            </InternalSettingsPrototypeNotice>
          </div>
        ) : null}

        {section === "login" ? (
          <div className="internal-operator-profile__form">
            <InternalReadonlyField label="Work email" value={email} verified />
            <InternalReadonlyField label="Sign-in" value="ARIA identity (email + password)" wrap />
            <InternalSettingsGroup title="Password" className="internal-settings-group--flush">
              {ARIA_IS_PREVIEW ? (
                <InternalSettingsRow label="Change password" hint="Not available in preview mode" />
              ) : (
                <InternalSettingsRow label="Change password" hint="Opens in a new tab" href="/forgot-password/" openInNewTab />
              )}
            </InternalSettingsGroup>
            <InternalReadonlyField
              label="Operator ID"
              value={operatorId}
              mono
              trailing={
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2.5 text-xs" onClick={() => void copyOperatorId()}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              }
            />
            <div className="internal-operator-profile__permissions internal-operator-profile__permissions--spaced">
              <PermissionRow label="Inspect customers and workspaces" allowed={caps.inspect} />
              <PermissionRow label="Change plans and grant credits" allowed={caps.plansAndCredits} />
              <PermissionRow label={PRD_INTERNAL_ROLE_MATRIX[2]!.label} allowed={caps.accountControls} />
            </div>
          </div>
        ) : null}

        <InternalSettingsFormFooter />
          </div>
        </div>
      </section>
    </div>
  );
}
