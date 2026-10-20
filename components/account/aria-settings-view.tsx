"use client";

import { AriaAccountPanel } from "@/components/account/aria-account-panel";
import { useAriaProfile } from "@/lib/aria-session";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

function ToggleRow({
  label,
  description,
  pressed,
  onPressedChange,
}: {
  label: string;
  description?: string;
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
}) {
  return (
    <div className="aria-settings__row">
      <div className="aria-settings__row-text">
        <span className="aria-settings__row-label">{label}</span>
        {description ? <span className="aria-settings__row-desc">{description}</span> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={pressed}
        className={cn("aria-settings__toggle", pressed && "aria-settings__toggle--on")}
        onClick={() => onPressedChange(!pressed)}
      >
        <span className="aria-settings__toggle-thumb" />
      </button>
    </div>
  );
}

function LinkRow({ label, value }: { label: string; value?: string }) {
  return (
    <button type="button" className="aria-settings__link-row">
      <span className="aria-settings__row-label">{label}</span>
      <span className="aria-settings__link-row-end">
        {value ? <span className="aria-settings__row-value">{value}</span> : null}
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
      </span>
    </button>
  );
}

export function AriaSettingsView() {
  const profile = useAriaProfile();
  const [emailProduct, setEmailProduct] = useState(true);
  const [emailSecurity, setEmailSecurity] = useState(true);

  return (
    <AriaAccountPanel
      variant="settings"
      title="Settings"
      description="Manage your account, preferences, and data."
    >
      <section className="aria-account-section" aria-labelledby="aria-settings-account">
        <h2 id="aria-settings-account" className="aria-account-section__title">
          Account
        </h2>
        <div className="aria-settings__group">
          <LinkRow label="Email" value={profile.email} />
          <LinkRow label="Password" value="••••••••" />
          <LinkRow label="Plan" value={profile.planLabel} />
        </div>
      </section>

      <section className="aria-account-section" aria-labelledby="aria-settings-general">
        <h2 id="aria-settings-general" className="aria-account-section__title">
          General
        </h2>
        <div className="aria-settings__group">
          <LinkRow label="Language" value="English (US)" />
          <LinkRow label="Appearance" value="Dark" />
          <LinkRow label="Spoken language" value="Auto-detect" />
        </div>
      </section>

      <section className="aria-account-section" aria-labelledby="aria-settings-notifications">
        <h2 id="aria-settings-notifications" className="aria-account-section__title">
          Notifications
        </h2>
        <div className="aria-settings__group">
          <ToggleRow
            label="Product updates"
            description="News about features and models."
            pressed={emailProduct}
            onPressedChange={setEmailProduct}
          />
          <ToggleRow
            label="Security alerts"
            description="Sign-in and account activity."
            pressed={emailSecurity}
            onPressedChange={setEmailSecurity}
          />
        </div>
      </section>

      <section className="aria-account-section" aria-labelledby="aria-settings-data">
        <h2 id="aria-settings-data" className="aria-account-section__title">
          Data controls
        </h2>
        <div className="aria-settings__group">
          <LinkRow label="Export data" />
          <LinkRow label="Archive all chats" />
          <button type="button" className="aria-settings__danger-row">
            Delete account
          </button>
        </div>
      </section>
    </AriaAccountPanel>
  );
}
