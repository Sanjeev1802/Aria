"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  formatTokenCount,
  getTokenLimit,
  loadTokenUsage,
  resetTokenUsage,
  saveTokenUsage,
} from "@/lib/aria/tokens";
import { getPlan, loadPlanId } from "@/lib/aria/plans";
import { loadConversations } from "@/lib/aria/conversations";
import { TokenUsageBar } from "@/components/chat/TokenUsageBar";
import { ConfirmDialog } from "@/components/chat/ConfirmDialog";
import { SparklesIcon } from "lucide-react";

function buildDaySeries(totalUsed: number) {
  const days = 14;
  const weights = Array.from({ length: days }, (_, i) => 0.4 + ((i * 17) % 10) / 10);
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: Math.round((totalUsed * w) / sum),
    };
  });
}

export function UsagePageClient() {
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(100_000);
  const [planName, setPlanName] = useState("Free");
  const [isFree, setIsFree] = useState(true);
  const [chatCount, setChatCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  function refresh() {
    const usage = loadTokenUsage();
    const planId = loadPlanId();
    const plan = getPlan(planId);
    const conversations = loadConversations();
    setUsed(usage.used);
    setLimit(getTokenLimit());
    setPlanName(plan.name);
    setIsFree(planId === "free");
    setUpdatedAt(usage.updatedAt);
    setChatCount(conversations.length);
    setMessageCount(
      conversations.reduce((sum, c) => sum + c.messages.length, 0),
    );
  }

  useEffect(() => {
    refresh();
  }, []);

  const series = useMemo(() => buildDaySeries(used), [used]);
  const maxBar = Math.max(1, ...series.map((s) => s.value));
  const pct = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const remaining = Math.max(0, limit - used);

  return (
    <div className="space-y-6">
      {isFree ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-accent/35 bg-accent/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Need more capacity?
            </p>
            <p className="mt-1 font-serif text-sm text-foreground/65">
              Upgrade for higher token limits and priority responses — like Plus
              on ChatGPT.
            </p>
          </div>
          <Link
            href="/dashboard/plans"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <SparklesIcon className="size-3.5" />
            Upgrade
          </Link>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-foreground/10 bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/40">
            Used
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {formatTokenCount(used)}
          </p>
          <p className="mt-1 text-[12px] text-foreground/45">{pct}% of limit</p>
        </div>
        <div className="rounded-2xl border border-foreground/10 bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/40">
            Remaining
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {formatTokenCount(remaining)}
          </p>
          <p className="mt-1 text-[12px] text-foreground/45">
            of {formatTokenCount(limit)}
          </p>
        </div>
        <div className="rounded-2xl border border-foreground/10 bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/40">
            Plan
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {planName}
          </p>
          <p className="mt-1 text-[12px] text-foreground/45">
            {chatCount} chats · {messageCount} messages
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-foreground/10 bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            Monthly token budget
          </h2>
          {updatedAt ? (
            <p className="text-[11px] text-foreground/40">
              Updated {new Date(updatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <TokenUsageBar used={used} limit={limit} />
      </section>

      <section className="rounded-2xl border border-foreground/10 bg-card p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">
          Last 14 days (estimated)
        </h2>
        <p className="mt-1 font-serif text-sm text-foreground/55">
          Distribution of your used tokens across recent days for a ChatGPT-style
          usage view.
        </p>
        <div className="mt-5 flex h-40 items-end gap-1.5 sm:gap-2">
          {series.map((day) => (
            <div
              key={day.label}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <div
                className="w-full rounded-t-md bg-foreground/70 transition-[height]"
                style={{
                  height: `${Math.max(4, (day.value / maxBar) * 100)}%`,
                }}
                title={`${day.label}: ${day.value.toLocaleString()} tokens`}
              />
              <span className="hidden truncate text-[9px] text-foreground/35 sm:block">
                {day.label.split(" ")[1]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Link
          href="/dashboard/plans"
          className="inline-flex h-9 items-center justify-center rounded-full border border-foreground/15 px-4 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
        >
          Manage plan
        </Link>
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          Reset usage (demo)
        </button>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Reset token usage?"
        description="This clears the local usage counter for demo purposes. Your chats are not deleted."
        confirmLabel="Reset usage"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          resetTokenUsage();
          saveTokenUsage({
            used: 0,
            limit: getTokenLimit(),
            updatedAt: Date.now(),
          });
          setResetOpen(false);
          refresh();
        }}
      />
    </div>
  );
}
