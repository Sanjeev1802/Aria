"use client";

import { CheckIcon, MinusIcon, MoonIcon, SunIcon } from "lucide-react";
import { ARIA_IS_PREVIEW } from "@/lib/aria-session";
import { InternalConsoleRegionalProfileFields } from "./internal-console-regional-fields";
import { InternalReadonlyField } from "./internal-readonly-field";
import { InternalSettingsGroup, InternalSettingsRow } from "./internal-settings-panel";
import {
  PRD_INTERNAL_ROLE_MATRIX,
  TEAM_ROLES,
  internalRoleLabel,
  teamRoleOf,
  type InternalRole,
  type RoleCell,
} from "./internal-operator-role";
import type { InternalColorScheme } from "./internal-theme-toggle";
import { isPlatformSettingsSection, type InternalSettingsSectionId } from "./internal-settings-sections";
import { InternalPlatformSettingsPanel } from "./internal-platform-settings-panels";
import type { InternalSection } from "./internal-section";

const cellText = (cell: RoleCell) => (cell === true ? "Yes" : cell === "granted" ? "If granted" : "—");

function RoleMatrixRow({ label, allowed }: { label: string; allowed: boolean }) {
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

export type InternalSettingsPanelProps = {
  section: InternalSettingsSectionId;
  operatorName: string;
  operatorEmail: string;
  operatorRole: InternalRole;
  colorScheme: InternalColorScheme;
  onColorSchemeChange: (scheme: InternalColorScheme) => void;
  isSuperAdmin: boolean;
  onOpenProfile: () => void;
  onOpenAdmin?: () => void;
  onViewAllActivity?: () => void;
  onNavigatePlatform?: (section: InternalSection) => void;
};

export function InternalSettingsSectionPanel(props: InternalSettingsPanelProps) {
  const { section } = props;

  if (props.isSuperAdmin && isPlatformSettingsSection(section) && section !== "appearance") {
    return <InternalPlatformSettingsPanel section={section} props={props} />;
  }

  if (section === "general") {
    return (
      <div className="internal-operator-profile__form">
        <InternalSettingsGroup title="Platform information">
          <InternalReadonlyField label="Application" value="ARIA Internal Console" />
        </InternalSettingsGroup>
        <InternalSettingsGroup title="Operator">
          <InternalReadonlyField label="Signed in as" value={`${props.operatorName} · ${internalRoleLabel(props.operatorRole)}`} wrap />
          <InternalSettingsRow
            label="Your profile"
            hint="Personal details and login & password"
            onClick={props.onOpenProfile}
          />
        </InternalSettingsGroup>
        <InternalSettingsGroup title="Regional settings">
          <InternalConsoleRegionalProfileFields />
        </InternalSettingsGroup>
      </div>
    );
  }

  if (section === "appearance") {
    return (
      <div className="internal-operator-profile__form">
        <InternalReadonlyField
          label="Scope"
          value="Applies to the internal console only — not the main ARIA chat app"
          wrap
        />
        <div className="internal-profile-field">
          <span className="internal-profile-field__label">Theme</span>
          <div className="internal-profile-field__control internal-profile-field__control--flush">
            <div className="internal-theme-switch" role="group" aria-label="Theme">
              <button
                type="button"
                className={`internal-theme-switch__option${props.colorScheme === "light" ? " internal-theme-switch__option--active" : ""}`}
                onClick={() => props.onColorSchemeChange("light")}
                aria-pressed={props.colorScheme === "light"}
              >
                <SunIcon className="size-4" aria-hidden />
                Light
              </button>
              <button
                type="button"
                className={`internal-theme-switch__option${props.colorScheme === "dark" ? " internal-theme-switch__option--active" : ""}`}
                onClick={() => props.onColorSchemeChange("dark")}
                aria-pressed={props.colorScheme === "dark"}
              >
                <MoonIcon className="size-4" aria-hidden />
                Dark
              </button>
            </div>
          </div>
        </div>
        <InternalReadonlyField
          label="Sidebar"
          value="Collapsible — expanded or icon rail; preference saved in this browser"
          wrap
        />
      </div>
    );
  }

  if (section === "security") {
    return (
      <div className="internal-operator-profile__form">
        <InternalSettingsGroup title="Sign-in">
          {ARIA_IS_PREVIEW ? (
            <InternalSettingsRow label="Change password" hint="Not available in preview mode" />
          ) : (
            <InternalSettingsRow
              label="Change password"
              hint="Main ARIA account flow — opens in a new tab"
              href="/forgot-password/"
              openInNewTab
            />
          )}
          <InternalReadonlyField label="Work email" value={props.operatorEmail} verified />
        </InternalSettingsGroup>
        <InternalSettingsGroup title="Session">
          <InternalReadonlyField
            label="Internal access"
            value="HttpOnly session cookie; operator allowlist checked on every API call"
            wrap
          />
          <InternalReadonlyField
            label="Authorization"
            value="Server enforces your internal role — hidden UI does not grant access"
            wrap
          />
        </InternalSettingsGroup>
        <p className="internal-operator-profile__hint">
          For audit history and customer session controls, use Audit activity and customer profiles in the main
          navigation.
        </p>
      </div>
    );
  }

  if (section === "users") {
    return (
      <div className="internal-operator-profile__form">
        <p className="internal-operator-profile__hint">
          Who can use ARIA Internal is configured on the server (identity allowlists). Customer workspace roles are
          managed in the main ARIA app.
        </p>
        <div className="internal-settings-role-table-wrap">
          <table className="internal-settings-role-table">
            <caption className="sr-only">Internal role permissions</caption>
            <thead>
              <tr>
                <th scope="col">Capability</th>
                {TEAM_ROLES.map(role => <th key={role} scope="col">{internalRoleLabel(role)}</th>)}
              </tr>
            </thead>
            <tbody>
              {PRD_INTERNAL_ROLE_MATRIX.map(row => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {TEAM_ROLES.map(role => (
                    <td key={role}>{cellText(row.roles[role])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="internal-operator-profile__permissions internal-operator-profile__permissions--spaced">
          <p className="internal-operator-profile__hint internal-operator-profile__hint--tight">
            Your role: {internalRoleLabel(props.operatorRole)}
          </p>
          {PRD_INTERNAL_ROLE_MATRIX.map(row => (
            <RoleMatrixRow key={row.label} label={row.label} allowed={row.roles[teamRoleOf(props.operatorRole)] === true} />
          ))}
        </div>
        {props.isSuperAdmin && props.onOpenAdmin ? (
          <InternalSettingsGroup title="Super admin">
            <InternalSettingsRow label="Admin hub" hint="Operational shortcuts" onClick={props.onOpenAdmin} />
          </InternalSettingsGroup>
        ) : null}
      </div>
    );
  }

  return null;
}
