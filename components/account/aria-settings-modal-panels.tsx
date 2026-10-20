"use client";

import {
  SettingsBlock,
  SettingsBlockInset,
  SettingsPanel,
} from "@/components/account/aria-settings-panel-layout";
import {
  SettingsDangerRow,
  SettingsLinkRow,
} from "@/components/account/aria-settings-rows";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAriaPricingPlan, type AriaPlanId } from "@/lib/aria-current-plan";
import { AriaWorkspaceSwitcher } from "@/components/account/aria-workspace-switcher";
import { ARIA_IS_PREVIEW, useAriaProfile } from "@/lib/aria-session";
import {
  loadAriaSidebarCredits,
  type AriaSidebarCreditsSnapshot,
} from "@/lib/aria-sidebar-credits-storage";
import { Info, Sparkles, UserRound, Users } from "lucide-react";
import { useEffect, useState } from "react";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function SettingsModalAccountPanel() {
  const { name, handle, avatar, email, planLabel } = useAriaProfile();
  const initials = initialsFromName(name);

  return (
    <SettingsPanel>
      <SettingsBlock title="Profile">
        <SettingsBlockInset>
          <div className="flex items-center gap-4">
            <Avatar className="size-16 text-lg" data-size="lg">
              {avatar ? <AvatarImage src={avatar} alt="" /> : null}
              <AvatarFallback className="bg-muted font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">@{handle}</p>
            </div>
          </div>
        </SettingsBlockInset>
      </SettingsBlock>
      <SettingsBlock title="Sign-in">
        <SettingsLinkRow label="Email" value={email} />
        {ARIA_IS_PREVIEW ? (
          <SettingsLinkRow label="Password" value="••••••••" />
        ) : (
          <SettingsLinkRow label="Password" value="Change password" href="/forgot-password/" />
        )}
        <SettingsLinkRow label="Plan" value={planLabel} />
      </SettingsBlock>
      {!ARIA_IS_PREVIEW ? (
        <SettingsBlock title="Workspace access">
          <SettingsBlockInset>
            <AriaWorkspaceSwitcher />
          </SettingsBlockInset>
        </SettingsBlock>
      ) : null}
    </SettingsPanel>
  );
}

export function SettingsModalPrivacyPanel() {
  return (
    <SettingsPanel>
      <SettingsBlock description="Control how ARIA uses your data in this preview workspace.">
        <SettingsLinkRow label="Shared links" value="Only me" />
        <SettingsLinkRow label="Training on my content" value="Off" />
        <SettingsLinkRow label="Export conversation history" />
      </SettingsBlock>
    </SettingsPanel>
  );
}

function formatCredits(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function BillingPlanIcon({ planId }: { planId: AriaPlanId | string }) {
  const Icon = planId === "team" ? Users : planId === "pro" ? Sparkles : UserRound;
  return <Icon className="aria-billing__icon" size={26} strokeWidth={1.5} aria-hidden />;
}

export function SettingsModalBillingPanel() {
  const { session } = useAriaProfile();
  const plan = getAriaPricingPlan(session.workspace?.plan);
  const [credits, setCredits] = useState<AriaSidebarCreditsSnapshot>(() => loadAriaSidebarCredits());

  useEffect(() => {
    setCredits(loadAriaSidebarCredits());
    const onUsage = () => setCredits(loadAriaSidebarCredits());
    window.addEventListener("aria:credits-updated", onUsage);
    return () => window.removeEventListener("aria:credits-updated", onUsage);
  }, []);

  const { used, included } = credits;
  const remaining = Math.max(0, included - used);
  const pct = included > 0 ? Math.min(100, (used / included) * 100) : 0;

  return (
    <div className="aria-billing">
      <header className="aria-billing__plan">
        <div className="aria-billing__identity">
          <BillingPlanIcon planId={plan?.id ?? ""} />
          <div className="aria-billing__identity-text">
            <h3 className="aria-billing__name">{plan ? `${plan.name} plan` : "No plan"}</h3>
            <p className="aria-billing__sub">{plan?.headline ?? "Sign in to see your plan"}</p>
          </div>
        </div>
      </header>

      <section className="aria-billing__usage" aria-label="Credit usage">
        <p className="aria-billing__usage-line">
          <span className="aria-billing__usage-label">Credits</span>
          <span className="tabular-nums">
            {" "}
            — {formatCredits(used)} of {formatCredits(included)} used, with{" "}
            {formatCredits(remaining)} left this month
          </span>
        </p>
        <div
          className="aria-billing__track"
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={included}
          aria-label={`${formatCredits(used)} of ${formatCredits(included)} credits used`}
        >
          <span className="aria-billing__bar" style={{ width: `${pct}%` }} />
        </div>
      </section>
    </div>
  );
}

export function SettingsModalDataPanel() {
  return (
    <SettingsPanel>
      <SettingsBlock title="Your data">
        <SettingsLinkRow label="Export data" />
        <SettingsLinkRow label="Archive all chats" />
        <SettingsDangerRow label="Delete account" />
      </SettingsBlock>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Business data connections require separate authorization in production.
        <Info className="ml-1 inline size-3.5 opacity-60" aria-hidden />
      </p>
    </SettingsPanel>
  );
}
