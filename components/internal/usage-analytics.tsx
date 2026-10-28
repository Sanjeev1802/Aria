"use client";

import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Activity, Coins, MessageSquare, Users } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { InternalKpiCard } from "./internal-kpi-card";

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
const REFRESH_MS = 30_000;
const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const chartConfig = {
  requests: { label: "Requests", color: "hsl(221 83% 53%)" },
  tokens: { label: "Tokens", color: "hsl(262 83% 58%)" },
  credits: { label: "Credits", color: "hsl(173 80% 36%)" },
} satisfies ChartConfig;
const PLAN_LABEL: Record<string, string> = { free: "Free", pro: "Pro", team: "Team" };

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

  return (
    <section className="internal-usage internal-page-stack" aria-labelledby="internal-usage-heading">
      <h2 id="internal-usage-heading" className="sr-only">Workspace usage</h2>

      <div className="internal-stats grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {usage ? (
          <>
            <InternalKpiCard label="Requests" value={fmt.format(usage.totals.requests)} icon={MessageSquare} tone="blue"
              footerTitle={`Last ${usage.days} days`} footerDetail="Chat messages answered" />
            <InternalKpiCard label="Tokens" value={compact.format(usage.totals.tokens)} icon={Activity} tone="violet"
              footerTitle="Input + output" footerDetail="Model usage" />
            <InternalKpiCard label="Credits used" value={fmt.format(usage.totals.credits)} icon={Coins} tone="teal"
              footerTitle="Charged" footerDetail="Settled requests" />
            <InternalKpiCard label="Active users" value={fmt.format(usage.totals.activeUsers)} icon={Users} tone="orange"
              footerTitle="Sent a message" footerDetail={`In ${usage.days} days`} />
          </>
        ) : error ? null : (
          [0, 1, 2, 3].map(index => <Skeleton key={index} className="h-[132px] rounded-xl" />)
        )}
      </div>

      <Card className="internal-chart-card internal-chart-card--area @container/card">
        <CardHeader>
          <CardTitle>Workspace usage</CardTitle>
          <CardDescription>
            Real activity from the credit ledger{usage?.limited ? " (first 500 workspaces)" : ""}.
            {usage && trackedRequests === 0 && usage.totals.tokens > 0
              ? " Request counts and credits are recorded from the day tracking began."
              : ""}
          </CardDescription>
          <CardAction className="col-start-1 row-start-3 mt-2 flex flex-wrap items-center gap-2 justify-self-start @[640px]/card:col-start-2 @[640px]/card:row-start-1 @[640px]/card:mt-0 @[640px]/card:justify-self-end">
            <ToggleGroup type="single" value={metric} variant="outline" size="sm" aria-label="Metric"
              onValueChange={value => { if (value === "requests" || value === "tokens" || value === "credits") setMetric(value); }}>
              <ToggleGroupItem value="requests">Requests</ToggleGroupItem>
              <ToggleGroupItem value="tokens">Tokens</ToggleGroupItem>
              <ToggleGroupItem value="credits">Credits</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup type="single" value={String(days)} variant="outline" size="sm" aria-label="Time range"
              onValueChange={value => { const next = Number(value); if ((WINDOWS as readonly number[]).includes(next)) setDays(next as (typeof WINDOWS)[number]); }}>
              <ToggleGroupItem value="7">7d</ToggleGroupItem>
              <ToggleGroupItem value="30">30d</ToggleGroupItem>
              <ToggleGroupItem value="90">90d</ToggleGroupItem>
            </ToggleGroup>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          {error && !usage ? (
            <p className="internal-state internal-error" role="alert">{error}</p>
          ) : !usage ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <ChartContainer config={chartConfig} className={`aspect-auto h-[250px] w-full transition-opacity ${stale ? "opacity-50" : ""}`}>
              <AreaChart data={usage.series}>
                <defs>
                  <linearGradient id="fillUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${metric})`} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={`var(--color-${metric})`} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}
                  tickFormatter={value => new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                <ChartTooltip cursor={false} content={
                  <ChartTooltipContent indicator="dot"
                    labelFormatter={value => new Date(`${String(value)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                } />
                <Area dataKey={metric} type="monotone" fill="url(#fillUsage)" stroke={`var(--color-${metric})`} />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {usage ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">Top users</CardTitle>
              <CardDescription>By tokens in the last {usage.days} days</CardDescription>
            </CardHeader>
            <CardContent>
              {usage.topUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity in this period yet.</p>
              ) : (
                <ol className="flex flex-col divide-y">
                  {usage.topUsers.map(user => (
                    <li key={user.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{user.name || user.email}</span>
                        {user.name ? <span className="block truncate text-xs text-muted-foreground">{user.email}</span> : null}
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        {compact.format(user.tokens)}
                        <span className="block text-xs text-muted-foreground">{fmt.format(user.requests)} requests</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">Usage by plan</CardTitle>
              <CardDescription>Tokens and credits in the last {usage.days} days</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {Object.entries(usage.byPlan).map(([plan, row]) => (
                  <li key={plan} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-medium">{PLAN_LABEL[plan] ?? plan}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {compact.format(row.tokens)} tokens · {fmt.format(row.credits)} credits
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
