"use client";

import { InternalConsoleRegionalFormFields } from "./internal-console-regional-fields";
import {
  InternalSettingsFormCard,
  InternalSettingsFormFooter,
  InternalSettingsPrototypeNotice,
  InternalSettingsReadonlyInput,
} from "./internal-settings-ui";
import type { InternalSettingsPanelProps } from "./internal-settings-section-panels";
import type { PlatformSettingsSectionId } from "./internal-settings-sections";

/** Display mirrors lib/server/accounts/entitlements PLANS monthlyUnits ÷ 1,000 — keep in sync manually until a policy API exists. */
const PLAN_CREDITS_PER_MONTH = { free: "200", pro: "6,000", team: "20,000" } as const;

export function InternalPlatformSettingsPanel({
  section,
}: {
  section: PlatformSettingsSectionId;
  props: InternalSettingsPanelProps;
}) {
  if (section === "general") {
    return (
      <div className="internal-platform-settings-stack">
        <InternalSettingsFormCard
          title="Platform information"
          description="This internal console only — not customer-facing ARIA product branding or checkout."
        >
          <InternalSettingsReadonlyInput label="Internal console name" value="ARIA Internal Console" />
        </InternalSettingsFormCard>
        <InternalSettingsFormCard
          title="Regional settings"
          description="Operator display defaults — change anytime; stored in this browser only."
        >
          <InternalConsoleRegionalFormFields />
        </InternalSettingsFormCard>
        <InternalSettingsPrototypeNotice>
          Not configured here: notification preferences (no Internal notification service) and platform behaviour
          (maintenance mode, customer app defaults) — those belong to the main ARIA product or infrastructure ops.
          Subscription plan copy and credits: sidebar Subscription. Per-customer changes: Customers and Workspaces.
        </InternalSettingsPrototypeNotice>
        <InternalSettingsFormFooter prototype />
      </div>
    );
  }

  if (section === "tokens") {
    return (
      <div className="internal-platform-settings-stack">
        <InternalSettingsFormCard title="Token rules" description="Defaults from the subscription catalog and entitlements (read-only here).">
          <InternalSettingsReadonlyInput
            label="Free plan — included credits / month"
            value={`${PLAN_CREDITS_PER_MONTH.free} credits`}
          />
          <InternalSettingsReadonlyInput
            label="Pro plan — included credits / month"
            value={`${PLAN_CREDITS_PER_MONTH.pro} credits`}
          />
          <InternalSettingsReadonlyInput
            label="Team plan — included credits / month"
            value={`${PLAN_CREDITS_PER_MONTH.team} credits`}
          />
          <InternalSettingsReadonlyInput label="Usage warning threshold (UI)" value="80% (planned)" hint="Not enforced platform-wide yet." />
          <InternalSettingsReadonlyInput label="Quota reset" value="Monthly · UTC period" />
          <InternalSettingsReadonlyInput label="Operator grant cap (Internal)" value="100 credits per action" hint="POST /api/admin/actions/ grant_credits" />
        </InternalSettingsFormCard>
        <InternalSettingsPrototypeNotice>
          Edit monthly credits on the Subscription sidebar page. Grant credits and change a customer&apos;s plan from
          Customers or Workspaces.
        </InternalSettingsPrototypeNotice>
        <InternalSettingsFormFooter prototype />
      </div>
    );
  }

  return null;
}
