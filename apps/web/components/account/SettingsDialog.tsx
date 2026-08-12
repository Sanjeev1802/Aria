"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@aria/auth";
import {
  defaultProfile,
  loadProfile,
  saveProfile,
  type ProfileData,
} from "@/lib/aria/profile";
import {
  defaultSettings,
  loadSettings,
  saveSettings,
  type SettingsData,
} from "@/lib/aria/settings";
import { applyTheme } from "@/lib/aria/theme";
import {
  formatTokenCount,
  getTokenLimit,
  loadTokenUsage,
} from "@/lib/aria/tokens";
import {
  getPlan,
  isTeamPlan,
  loadPlanId,
  type PlanId,
} from "@/lib/aria/plans";
import {
  ensureWorkspaceUser,
  isAdminEmail,
} from "@/lib/aria/users";
import { UsersPageClient } from "@/components/account/UsersPageClient";
import {
  BellIcon,
  CheckIcon,
  DatabaseIcon,
  GaugeIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

export type SettingsTab =
  | "profile"
  | "general"
  | "notifications"
  | "usage"
  | "data"
  | "team";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: SettingsTab;
};

export function SettingsDialog({
  open,
  onOpenChange,
  initialTab = "general",
}: SettingsDialogProps) {
  const titleId = useId();
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [savedFlash, setSavedFlash] = useState(false);
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(100_000);
  const [planId, setPlanId] = useState<PlanId>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const savedTimerRef = useRef<number | null>(null);
  const profileSaveTimerRef = useRef<number | null>(null);

  const planName = getPlan(planId).name;
  const canManageTeam = isTeamPlan(planId) && isAdmin;

  const tabs = useMemo(() => {
    const base: {
      id: SettingsTab;
      label: string;
      icon: ComponentType<{ className?: string; strokeWidth?: number }>;
    }[] = [
      { id: "profile", label: "Profile", icon: UserIcon },
      { id: "general", label: "General", icon: SettingsIcon },
      { id: "notifications", label: "Notifications", icon: BellIcon },
      { id: "usage", label: "Usage", icon: GaugeIcon },
      { id: "data", label: "Data controls", icon: DatabaseIcon },
      { id: "team", label: "Team", icon: UsersIcon },
    ];
    return base;
  }, []);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setSettings(loadSettings());
    const loadedProfile = loadProfile();
    if (!loadedProfile.displayName && user) {
      loadedProfile.displayName =
        user.displayName || user.email?.split("@")[0] || "";
    }
    setProfile(loadedProfile);
    const usage = loadTokenUsage();
    setUsed(usage.used);
    setLimit(getTokenLimit());
    const id = loadPlanId();
    setPlanId(id);
    if (user?.email) {
      ensureWorkspaceUser(user.email, user.displayName);
      setIsAdmin(isAdminEmail(user.email));
    } else {
      setIsAdmin(false);
    }
    setSavedFlash(false);
  }, [open, initialTab, user]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  function updateSettings<K extends keyof SettingsData>(
    key: K,
    value: SettingsData[K],
  ) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      if (key === "theme") {
        applyTheme(value as SettingsData["theme"]);
      }
      return next;
    });
    flashSaved();
  }

  function flashSaved() {
    if (savedTimerRef.current) {
      window.clearTimeout(savedTimerRef.current);
    }
    setSavedFlash(true);
    savedTimerRef.current = window.setTimeout(() => {
      setSavedFlash(false);
      savedTimerRef.current = null;
    }, 2000);
  }

  function updateProfile<K extends keyof ProfileData>(
    key: K,
    value: ProfileData[K],
  ) {
    setProfile((prev) => {
      const next = { ...prev, [key]: value };
      if (profileSaveTimerRef.current) {
        window.clearTimeout(profileSaveTimerRef.current);
      }
      profileSaveTimerRef.current = window.setTimeout(() => {
        saveProfile(next);
        flashSaved();
        profileSaveTimerRef.current = null;
      }, 400);
      return next;
    });
  }

  function saveAccountProfile(event: FormEvent) {
    event.preventDefault();
    if (profileSaveTimerRef.current) {
      window.clearTimeout(profileSaveTimerRef.current);
      profileSaveTimerRef.current = null;
    }
    saveProfile(profile);
    flashSaved();
  }

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
      if (profileSaveTimerRef.current) {
        window.clearTimeout(profileSaveTimerRef.current);
      }
    };
  }, []);

  if (!open) return null;

  const active = tabs.find((item) => item.id === tab) ?? tabs[0];

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center p-0 sm:items-center sm:p-4 md:p-6">
      <button
        type="button"
        aria-label="Close settings"
        className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px] max-sm:bg-background"
        onClick={() => onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-dvh w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-background text-foreground shadow-none sm:h-[min(40rem,calc(100dvh-2rem))] sm:max-w-[52rem] sm:flex-row sm:rounded-2xl sm:border sm:border-foreground/10 sm:shadow-[0_24px_80px_rgba(20,20,19,0.18)]"
      >
        {/* Mobile top bar + horizontal tabs */}
        <div className="flex shrink-0 flex-col border-b border-foreground/10 sm:hidden">
          <div className="flex h-12 items-center gap-2 px-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-foreground/15 text-foreground/70 transition-colors hover:bg-foreground/5"
              aria-label="Close"
            >
              <XIcon className="size-4" />
            </button>
            <p
              id={titleId}
              className="text-[15px] font-semibold text-foreground"
            >
              Settings
            </p>
          </div>
          <nav
            className="flex gap-1 overflow-x-auto px-2.5 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Settings sections"
          >
            {tabs.map(({ id, label, icon: Icon }) => {
              const selected = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors ${
                    selected
                      ? "bg-foreground text-background"
                      : "bg-foreground/[0.06] text-foreground/65"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Desktop left nav */}
        <aside className="hidden w-52 shrink-0 flex-col border-r border-foreground/10 bg-card sm:flex">
          <div className="flex h-12 items-center gap-2 px-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-foreground/15 text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
              aria-label="Close"
            >
              <XIcon className="size-4" />
            </button>
            <p className="text-[13px] font-medium text-foreground/55">
              Settings
            </p>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pb-3">
            {tabs.map(({ id, label, icon: Icon }) => {
              const selected = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  title={label}
                  className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors ${
                    selected
                      ? "bg-foreground/[0.08] font-medium text-foreground"
                      : "text-foreground/55 hover:bg-foreground/[0.05] hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          <div className="hidden h-12 items-center justify-between border-b border-foreground/10 px-5 sm:flex">
            <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
              {active.label}
            </h2>
          </div>

          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            <h2 className="mb-3 text-[16px] font-semibold tracking-tight text-foreground sm:hidden">
              {active.label}
            </h2>
            {tab === "profile" ? (
              <ProfilePanel
                email={user?.email ?? null}
                planName={planName}
                profile={profile}
                onChange={updateProfile}
                onSave={saveAccountProfile}
              />
            ) : null}
            {tab === "general" ? (
              <GeneralPanel
                settings={settings}
                onChange={updateSettings}
              />
            ) : null}
            {tab === "notifications" ? (
              <NotificationsPanel
                settings={settings}
                onChange={updateSettings}
              />
            ) : null}
            {tab === "usage" ? (
              <UsagePanel
                used={used}
                limit={limit}
                planName={planName}
                onManagePlan={() => {
                  onOpenChange(false);
                  router.push("/dashboard/plans");
                }}
              />
            ) : null}
            {tab === "data" ? (
              <DataPanel settings={settings} onChange={updateSettings} />
            ) : null}
            {tab === "team" ? (
              canManageTeam ? (
                <UsersPageClient />
              ) : (
                <TeamLockedPanel
                  planName={planName}
                  onUpgrade={() => {
                    onOpenChange(false);
                    router.push("/dashboard/plans");
                  }}
                />
              )
            ) : null}

            {savedFlash ? (
              <div
                role="status"
                aria-live="polite"
                className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground px-3.5 py-2 text-[13px] font-medium text-background shadow-lg">
                  <CheckIcon className="size-3.5 shrink-0" strokeWidth={2.25} />
                  Saved
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
  last,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 ${
        last ? "" : "border-b border-foreground/10"
      }`}
    >
      <div className="min-w-0 sm:max-w-[55%]">
        <p className="text-[14px] font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mt-1 text-[13px] leading-relaxed text-foreground/50">
            {description}
          </p>
        ) : null}
      </div>
      <div className="w-full shrink-0 sm:w-auto sm:min-w-[11rem] sm:text-right">
        {children}
      </div>
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-foreground/12 bg-card px-3 text-[13px] text-foreground outline-none sm:w-auto sm:min-w-[9.5rem]"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-foreground" : "bg-foreground/20"
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-background shadow transition-transform ${
          checked ? "translate-x-[1.35rem]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ProfilePanel({
  email,
  planName,
  profile,
  onChange,
  onSave,
}: {
  email: string | null;
  planName: string;
  profile: ProfileData;
  onChange: <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => void;
  onSave: (event: FormEvent) => void;
}) {
  const initial = (
    profile.displayName?.[0] ||
    email?.[0] ||
    "A"
  ).toUpperCase();

  const fieldClass =
    "box-border h-10 w-full rounded-xl border border-foreground/12 bg-card px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-foreground/35 focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10";

  return (
    <form onSubmit={onSave} className="space-y-5">
      <div className="flex items-center gap-3 border-b border-foreground/10 pb-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-foreground text-[15px] font-semibold text-background">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-foreground">
            {profile.displayName || "Your profile"}
          </p>
          <p className="truncate text-[13px] text-foreground/50">
            {email ?? "—"}
          </p>
          <p className="mt-0.5 text-[12px] text-foreground/40">{planName} plan</p>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-[13px] font-medium text-foreground/70">
          Display name
        </span>
        <input
          value={profile.displayName}
          onChange={(e) => onChange("displayName", e.target.value)}
          placeholder="Alex Rivera"
          className={fieldClass}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-[13px] font-medium text-foreground/70">
          Job title
        </span>
        <input
          value={profile.jobTitle}
          onChange={(e) => onChange("jobTitle", e.target.value)}
          placeholder="Head of Analytics"
          className={fieldClass}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-[13px] font-medium text-foreground/70">
          Company / organization
        </span>
        <input
          value={profile.company}
          onChange={(e) => onChange("company", e.target.value)}
          placeholder="Acme Corp"
          className={fieldClass}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-[13px] font-medium text-foreground/70">
          About you
        </span>
        <textarea
          rows={3}
          value={profile.bio}
          onChange={(e) => onChange("bio", e.target.value)}
          placeholder="What should ARIA know about your role and goals?"
          className={`${fieldClass} h-auto resize-none py-2.5`}
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-foreground/70">
          Preferred response style
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["concise", "Concise"],
              ["balanced", "Balanced"],
              ["detailed", "Detailed"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange("preferredTone", value)}
              className={`rounded-xl border px-3 py-2.5 text-left text-[13px] transition-colors ${
                profile.preferredTone === value
                  ? "border-foreground/25 bg-foreground/[0.06] font-medium text-foreground"
                  : "border-foreground/10 text-foreground/65 hover:bg-foreground/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
        >
          Save
        </button>
      </div>
    </form>
  );
}

function GeneralPanel({
  settings,
  onChange,
}: {
  settings: SettingsData;
  onChange: <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => void;
}) {
  return (
    <div>
      <Section
        title="Theme"
        description="Choose how ARIA looks on this device."
      >
        <SelectField
          value={settings.theme}
          onChange={(v) =>
            onChange("theme", v as SettingsData["theme"])
          }
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </Section>
      <Section title="Language" description="Language used in the interface.">
        <SelectField
          value={settings.language}
          onChange={(v) => onChange("language", v)}
          options={[
            { value: "English", label: "English" },
            { value: "Spanish", label: "Spanish" },
            { value: "French", label: "French" },
            { value: "German", label: "German" },
          ]}
        />
      </Section>
      <Section
        title="Send with Enter"
        description="Press Enter to send messages. Use Shift+Enter for a new line."
      >
        <Toggle
          label="Send with Enter"
          checked={settings.enterToSend}
          onChange={(v) => onChange("enterToSend", v)}
        />
      </Section>
      <Section
        title="Show tips"
        description="Occasional tips in empty chats and the composer."
        last
      >
        <Toggle
          label="Show tips"
          checked={settings.showTips}
          onChange={(v) => onChange("showTips", v)}
        />
      </Section>
    </div>
  );
}

function NotificationsPanel({
  settings,
  onChange,
}: {
  settings: SettingsData;
  onChange: <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => void;
}) {
  return (
    <div>
      <Section
        title="Email notifications"
        description="Account and security alerts for your workspace."
      >
        <Toggle
          label="Email notifications"
          checked={settings.emailNotifications}
          onChange={(v) => onChange("emailNotifications", v)}
        />
      </Section>
      <Section
        title="Product updates"
        description="Occasional notes about new ARIA features."
        last
      >
        <Toggle
          label="Product updates"
          checked={settings.productUpdates}
          onChange={(v) => onChange("productUpdates", v)}
        />
      </Section>
    </div>
  );
}

function UsagePanel({
  used,
  limit,
  planName,
  onManagePlan,
}: {
  used: number;
  limit: number;
  planName: string;
  onManagePlan: () => void;
}) {
  const pct = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-foreground/10 bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] text-foreground/40">Current plan</p>
            <p className="mt-0.5 text-[15px] font-semibold text-foreground">
              {planName}
            </p>
          </div>
          <button
            type="button"
            onClick={onManagePlan}
            className="rounded-full border border-foreground/15 px-3 py-1.5 text-[12px] font-medium text-foreground/75 transition-colors hover:bg-foreground/5"
          >
            Manage plan
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[14px] font-medium text-foreground">All models</p>
          <p className="text-[13px] text-foreground/45">
            {formatTokenCount(used)} / {formatTokenCount(limit)}
          </p>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-foreground/75"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-[12px] text-foreground/40">
          {pct}% of your plan used this period
        </p>
      </div>
    </div>
  );
}

function DataPanel({
  settings,
  onChange,
}: {
  settings: SettingsData;
  onChange: <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => void;
}) {
  return (
    <div>
      <Section
        title="Improve the model for everyone"
        description="Allow anonymized chats to help improve ARIA. Turn off anytime."
        last
      >
        <Toggle
          label="Improve the model"
          checked={settings.trainOnChats}
          onChange={(v) => onChange("trainOnChats", v)}
        />
      </Section>
    </div>
  );
}

function TeamLockedPanel({
  planName,
  onUpgrade,
}: {
  planName: string;
  onUpgrade: () => void;
}) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-card p-5">
      <p className="text-[15px] font-semibold text-foreground">
        Team is on Business
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/55">
        You’re on {planName}. Upgrade to Business to invite organization members
        with Admin and User roles.
      </p>
      <button
        type="button"
        onClick={onUpgrade}
        className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
      >
        View plans
      </button>
    </div>
  );
}
