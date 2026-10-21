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
import { ARIA_IS_PREVIEW, ariaFetch, refreshAriaSession, useAriaProfile } from "@/lib/aria-session";
import { avatarFromFile } from "@/lib/aria-profile-image";
import {
  loadAriaSidebarCredits,
  type AriaSidebarCreditsSnapshot,
} from "@/lib/aria-sidebar-credits-storage";
import { Info, Sparkles, UserRound, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftAvatar, setDraftAvatar] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const initials = initialsFromName(name);
  const shownAvatar = draftAvatar === undefined ? avatar : draftAvatar ?? "";

  useEffect(() => { if (!editing) setDraftName(name); }, [editing, name]);

  const cancel = () => {
    setEditing(false);
    setDraftName(name);
    setDraftAvatar(undefined);
    setError("");
  };

  const save = async () => {
    const nextName = draftName.trim().replace(/\s+/g, " ");
    if (!nextName || nextName.length > 80) { setError("Enter a name between 1 and 80 characters."); return; }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await ariaFetch("/api/profile/", { method: "PATCH", body: JSON.stringify({
        name: nextName, ...(draftAvatar !== undefined ? { avatar: draftAvatar } : {}),
      }) });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Could not save your profile.");
      }
      await refreshAriaSession();
      setDraftAvatar(undefined);
      setEditing(false);
      setNotice("Profile updated.");
      window.dispatchEvent(new Event("aria:team-updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your profile.");
    } finally { setBusy(false); }
  };

  return (
    <SettingsPanel>
      <SettingsBlock title="Profile">
        <SettingsBlockInset>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar className="size-16 text-lg" data-size="lg">
              {shownAvatar ? <AvatarImage src={shownAvatar} alt="" /> : null}
              <AvatarFallback className="bg-muted font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">@{handle}</p>
            </div>
            {!editing && !ARIA_IS_PREVIEW ? <Button type="button" variant="outline" size="sm" onClick={() => {
              setError(""); setNotice(""); setEditing(true);
            }}>Edit profile</Button> : null}
          </div>
          {editing ? <div className="mt-5 space-y-4 border-t border-border/70 pt-5">
            <div className="space-y-1.5">
              <label htmlFor="aria-profile-name" className="text-sm font-medium">Display name</label>
              <Input id="aria-profile-name" value={draftName} maxLength={80}
                onChange={event => setDraftName(event.target.value)} autoComplete="name" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
                aria-label="Choose profile photo" onChange={async event => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setError("");
                  setPreparingPhoto(true);
                  try { setDraftAvatar(await avatarFromFile(file)); }
                  catch (cause) { setError(cause instanceof Error ? cause.message : "Could not prepare this image."); }
                  finally { setPreparingPhoto(false); if (fileInput.current) fileInput.current.value = ""; }
                }} />
              <Button type="button" variant="outline" size="sm" disabled={busy || preparingPhoto} onClick={() => fileInput.current?.click()}>{preparingPhoto ? "Preparing photo…" : "Upload photo"}</Button>
              {shownAvatar ? <Button type="button" variant="ghost" size="sm" disabled={busy || preparingPhoto} onClick={() => setDraftAvatar(null)}>Remove photo</Button> : null}
              <span className="text-xs text-muted-foreground">PNG, JPEG, or WebP · up to 5 MB</span>
            </div>
            {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={busy || preparingPhoto} onClick={cancel}>Cancel</Button>
              <Button type="button" disabled={busy || preparingPhoto} onClick={() => void save()}>{busy ? "Saving…" : "Save changes"}</Button>
            </div>
          </div> : null}
          {notice ? <p className="mt-3 text-sm text-emerald-500" role="status">{notice}</p> : null}
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
