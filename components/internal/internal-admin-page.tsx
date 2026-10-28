"use client";

import { ArrowRight } from "lucide-react";
import { InternalSettingsGroup, InternalSettingsRow } from "./internal-settings-panel";
import type { InternalSection } from "./internal-section";

export function InternalAdminPage({ onNavigate }: { onNavigate: (section: InternalSection) => void }) {
  return (
    <div className="internal-admin-page">
      <div className="internal-admin-page__sections">
        <InternalSettingsGroup title="Customer operations">
          <InternalSettingsRow label="All customers" hint="Search, profiles, plans, and credits" onClick={() => onNavigate("customers")} />
          <InternalSettingsRow label="Audit activity" hint="Latest 12 actions" onClick={() => onNavigate("activity")} />
        </InternalSettingsGroup>

        <InternalSettingsGroup title="Entitlements">
          <InternalSettingsRow label="Subscription plans" hint="Edit Pro and Team pricing shown on ARIA" onClick={() => onNavigate("subscription")} />
          <InternalSettingsRow label="Operations runbook" hint="Setup and reconciliation notes" onClick={() => onNavigate("operations")} />
        </InternalSettingsGroup>
      </div>

      <p className="internal-admin-page__footnote">
        <ArrowRight className="size-3.5 shrink-0" aria-hidden />
        Server permissions apply on every API call. UI shortcuts do not grant access.
      </p>
    </div>
  );
}
