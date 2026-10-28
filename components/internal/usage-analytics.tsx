"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Activity, Coins, MessageSquare, Users } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { InternalKpiCard } from "./internal-kpi-card";
import { SegmentedControl } from "./segmented-control";

type Metric = "requests" | "tokens" | "credits";
type Usage = {
  days: number;
  series: { date: string; tokens: number; requests: number; credits: number; activeUsers: number }[];
  topUsers: { id: string; email: string; name: string; tokens: number; requests: number; credits: number }[];
  byPlan: Record<string, { tokens: number; requests: number; credits: number }>;
  totals: { tokens: number; requests: number; credits: number; activeUsers: number };
  limited: boolean;
};

const WINDOWS = [7, 30, 90] as const;
const RANGE_OPTIONS = [{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }] as const;
const METRIC_OPTIONS = [{ value: "requests", label: "Requests" }, { value: "tokens", label: "Tokens" }, { value: "credits", label: "Credits" }] as const;
const REFRESH_MS = 30_000;
const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const chartConfig = {
  requests: { label: "Requests", color: "hsl(243 75% 59%)" },
  tokens: { label: "Tokens", color: "hsl(262 83% 58%)" },
  credits: { label: "Credits", color: "hsl(173 80% 36%)" },
} satisfies ChartConfig;
const PLAN_LABEL: Record<string, string> = { free: "Free", pro: "Pro", team: "Team" };
const dayLabel = (value: unknown) => new Date(`${String(value)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const initials = (text: string) => (text.trim()[0] ?? "?").toUpperCase();

/** Workspace activity from the credit ledger; refreshes while the console is open so it stays live. */
export function UsageAnalytics() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const [metric, setMetric] = useState<Metric>("requests");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");

  const load = useCallback((window: number) => fetch(`/api/admin/usage/?days=${window}`, { credentials: "same-origin", cache: "no-store" })
    .then(async response => {
      if (!response.ok) throw new Error(response.status === 401 ? "Your session expired. Sign in again." : "Usage is unavailable right now.");
      return await response.json() as Usage;
    })
    .then(next => { setUsage(next); setError(""); })
    .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Usage is unavailable right now.")), []);

  useEffect(() => {
    void load(days);
    const id = window.setInterval(() => { if (document.visibilityState === "visible") void load(days); }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [days, load]);

  const stale = usage !== null && usage.days !== days;
  const trackedRequests = usage?.totals.requests ?? 0;
  const maxUserTokens = Math.max(1, ...(usage?.topUsers.map(user => user.tokens) ?? [1]));
  const planTokens = Math.max(1, Object.values(usage?.byPlan ?? {}).reduce((sum, row) => sum + row.tokens, 0));

  return (
    <section className="internal-section" aria-labelledby="internal-usage-heading">
      <header className="internal-section__head">
        <div>
          <h2 id="internal-usage-heading" className="internal-section__title">Usage</h2>
          <p className="internal-section__sub">
            <span className="internal-live" aria-hidden="true" /> Live from the credit ledger · refreshes every 30 seconds
          </p>
        </div>
        <SegmentedControl label="Time range" value={String(days)} options={RANGE_OPTIONS}
          onChange={value => setDays(Number(value) as (typeof WINDOWS)[number])} />
      </header>

      <div className="internal-kpi-grid">
        {usage ? (
          <>
            <InternalKpiCard index={0} label="Requests" value={usage.totals.requests} format={n => fmt.format(Math.round(n))}
              icon={MessageSquare} tone="blue" footerTitle={`Last ${usage.days} days`} footerDetail="Messages answered" />
            <InternalKpiCard index={1} label="Tokens" value={usage.totals.tokens} format={n => compact.format(n)}
              icon={Activity} tone="violet" footerTitle="Input + output" footerDetail="Model usage" />
            <InternalKpiCard index={2} label="Credits charged" value={usage.totals.credits} format={n => fmt.format(n)}
              icon={Coins} tone="teal" footerTitle={`Last ${usage.days} days`} footerDetail="Settled requests" />
            <InternalKpiCard index={3} label="Active users" value={usage.totals.activeUsers} format={n => fmt.format(Math.round(n))}
              icon={Users} tone="orange" footerTitle="Sent a message" footerDetail={`In ${usage.days} days`} />
          </>
        ) : error ? null : (
          [0, 1, 2, 3].map(index => <Skeleton key={index} className="internal-kpi-skeleton" />)
        )}
      </div>

      <div className="internal-split">
        <Card className="internal-chart-card internal-usage-chart @container/card">
          <CardHeader>
            <CardTitle>Activity over time</CardTitle>
            <CardDescription>
              {usage?.limited ? "First 500 workspaces. " : ""}
              {usage && trackedRequests === 0 && usage.totals.tokens > 0
                ? "Request counts and credits are recorded from the day tracking began."
                : "One point per day, in UTC."}
            </CardDescription>
            <CardAction>
              <SegmentedControl label="Metric" value={metric} options={METRIC_OPTIONS} onChange={setMetric} />
            </CardAction>
          </CardHeader>
          <CardContent className="px-2 pt-2 sm:px-6">
            {error && !usage ? (
              <p className="internal-state internal-error" role="alert">{error}</p>
            ) : !usage ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ChartContainer config={chartConfig} className={`internal-chart-fade aspect-auto h-[280px] w-full ${stale ? "is-stale" : ""}`}>
                <AreaChart data={usage.series} margin={{ left: 4, right: 4, top: 8 }}>
                  <defs>
                    <linearGradient id="fillUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={`var(--color-${metric})`} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={`var(--color-${metric})`} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 4" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} minTickGap={36} tickFormatter={dayLabel} />
                  <ChartTooltip cursor={{ stroke: `var(--color-${metric})`, strokeOpacity: 0.25 }}
                    content={<ChartTooltipContent indicator="dot" labelFormatter={dayLabel} />} />
                  <Area dataKey={metric} type="monotone" fill="url(#fillUsage)" stroke={`var(--color-${metric})`} strokeWidth={2}
                    activeDot={{ r: 4 }} animationDuration={700} animationEasing="ease-out" />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <div className="internal-split__aside">
          <Card className="internal-side-card">
            <CardHeader>
              <CardTitle>Top users</CardTitle>
              <CardDescription>By tokens, last {days} days</CardDescription>
            </CardHeader>
            <CardContent>
              {!usage ? (
                <Skeleton className="h-[120px] w-full" />
              ) : usage.topUsers.length === 0 ? (
                <p className="internal-empty">No activity in this period yet.</p>
              ) : (
                <ol className="internal-rank">
                  {usage.topUsers.map((user, at) => (
                    <li key={user.id} className="internal-rank__row" style={{ "--i": at } as CSSProperties}>
                      <span className="internal-user-chip" aria-hidden="true">{initials(user.name || user.email)}</span>
                      <span className="internal-rank__who">
                        <span className="internal-rank__name">{user.name || user.email}</span>
                        <span className="internal-meter" aria-hidden="true">
                          <span className="internal-meter__fill" style={{ width: `${Math.max(4, (user.tokens / maxUserTokens) * 100)}%` }} />
                        </span>
                      </span>
                      <span className="internal-rank__num">
                        {compact.format(user.tokens)}
                        <small>{fmt.format(user.requests)} req</small>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="internal-side-card">
            <CardHeader>
              <CardTitle>Usage by plan</CardTitle>
              <CardDescription>Share of tokens, last {days} days</CardDescription>
            </CardHeader>
            <CardContent>
              {!usage ? (
                <Skeleton className="h-[96px] w-full" />
              ) : (
                <ul className="internal-plan-split">
                  {Object.entries(usage.byPlan).map(([plan, row]) => (
                    <li key={plan}>
                      <span className="internal-plan-split__line">
                        <span className="internal-plan-split__name">{PLAN_LABEL[plan] ?? plan}</span>
                        <span className="internal-plan-split__num">{compact.format(row.tokens)} tokens · {fmt.format(row.credits)} credits</span>
                      </span>
                      <span className="internal-meter" aria-hidden="true">
                        <span className={`internal-meter__fill internal-meter__fill--${plan}`} style={{ width: `${(row.tokens / planTokens) * 100}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
