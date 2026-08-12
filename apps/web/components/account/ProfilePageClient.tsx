"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@aria/auth";
import {
  defaultProfile,
  loadProfile,
  saveProfile,
  type ProfileData,
} from "@/lib/aria/profile";
import { getPlan, loadPlanId } from "@/lib/aria/plans";
import Link from "next/link";
import { SparklesIcon } from "lucide-react";

const fieldClass =
  "box-border h-10 w-full rounded-xl border border-foreground/12 bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/35 focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10";

export function ProfilePageClient() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile());
  const [saved, setSaved] = useState(false);
  const [planName, setPlanName] = useState("Free");

  useEffect(() => {
    const loaded = loadProfile();
    if (!loaded.displayName && user) {
      loaded.displayName =
        user.displayName || user.email?.split("@")[0] || "";
    }
    setProfile(loaded);
    setPlanName(getPlan(loadPlanId()).name);
  }, [user]);

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    saveProfile(profile);
    setSaved(true);
  }

  const initial = (
    profile.displayName?.[0] ||
    user?.email?.[0] ||
    "A"
  ).toUpperCase();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-foreground/10 bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-full bg-foreground text-lg font-semibold text-background">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">
                {profile.displayName || "Your profile"}
              </p>
              <p className="truncate text-sm text-foreground/55">
                {user?.email ?? "—"}
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/40">
                {planName} plan
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/plans"
            className="inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:self-auto"
          >
            <SparklesIcon className="size-3.5" />
            Upgrade
          </Link>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-foreground/10 bg-card p-5 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-foreground/70">
              Display name
            </span>
            <input
              className={fieldClass}
              value={profile.displayName}
              onChange={(e) => update("displayName", e.target.value)}
              placeholder="Alex Rivera"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-foreground/70">
              Job title
            </span>
            <input
              className={fieldClass}
              value={profile.jobTitle}
              onChange={(e) => update("jobTitle", e.target.value)}
              placeholder="Head of Analytics"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-[12px] font-medium text-foreground/70">
              Company
            </span>
            <input
              className={fieldClass}
              value={profile.company}
              onChange={(e) => update("company", e.target.value)}
              placeholder="Acme Corp"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-[12px] font-medium text-foreground/70">
              About you
            </span>
            <textarea
              rows={3}
              className={`${fieldClass} h-auto resize-none py-2.5`}
              value={profile.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="What should ARIA know about your role and goals?"
            />
          </label>
        </div>

        <fieldset>
          <legend className="mb-2 text-[12px] font-medium text-foreground/70">
            Preferred response tone
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
                onClick={() => update("preferredTone", value)}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
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

        <div className="flex items-center justify-between gap-3 border-t border-foreground/10 pt-4">
          <p className="text-[12px] text-foreground/45">
            {saved ? "Profile saved on this device." : "Changes are local until you save."}
          </p>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Save profile
          </button>
        </div>
      </form>
    </div>
  );
}
