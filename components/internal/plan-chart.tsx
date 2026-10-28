"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";

type PlanId = "free" | "pro" | "team";
type WorkspaceSlice = { plan: PlanId; createdAt?: number };

const chartConfig = {
  workspaces: { label: "Workspaces" },
  team: { label: "Team", color: "hsl(173 80% 36%)" },
  pro: { label: "Pro", color: "hsl(262 83% 58%)" },
  free: { label: "Free", color: "hsl(243 75% 59%)" },
} satisfies ChartConfig;

type TimeRange = "90d" | "30d" | "7d";

function rangeMeta(range: TimeRange) {
  switch (range) {
    case "90d":
      return { days: 90, long: "Total for the last 3 months", short: "Last 3 months" };
    case "30d":
      return { days: 30, long: "Total for the last 30 days", short: "Last 30 days" };
    case "7d":
      return { days: 7, long: "Total for the last 7 days", short: "Last 7 days" };
  }
}

/** Cumulative workspaces by plan — one point per day, from workspace createdAt when available. */
function buildCumulativeSeries(workspaces: WorkspaceSlice[], range: TimeRange) {
  const { days } = rangeMeta(range);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const fallbackCreated = start.getTime();

  const series: { date: string; free: number; pro: number; team: number }[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);
    day.setHours(23, 59, 59, 999);
    const cutoff = day.getTime();
    let free = 0;
    let pro = 0;
    let team = 0;
    for (const workspace of workspaces) {
      const created = workspace.createdAt ?? fallbackCreated;
      if (created > cutoff) continue;
      if (workspace.plan === "free") free += 1;
      else if (workspace.plan === "pro") pro += 1;
      else team += 1;
    }
    series.push({ date: day.toISOString().slice(0, 10), free, pro, team });
  }
  return series;
}

export function PlanChart({
  counts,
  workspaces,
}: {
  counts: { free: number; pro: number; team: number };
  workspaces: WorkspaceSlice[];
}) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = useState<TimeRange>("90d");

  useEffect(() => {
    if (isMobile) setTimeRange("7d");
  }, [isMobile]);

  const meta = rangeMeta(timeRange);
  const chartData = useMemo(() => buildCumulativeSeries(workspaces, timeRange), [workspaces, timeRange]);

  return (
    <Card className="internal-chart-card internal-chart-card--area @container/card">
      <CardHeader>
        <CardTitle>Workspace distribution</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">{meta.long}</span>
          <span className="@[540px]/card:hidden">{meta.short}</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={value => {
              if (value === "90d" || value === "30d" || value === "7d") setTimeRange(value);
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={value => {
              if (value === "90d" || value === "30d" || value === "7d") setTimeRange(value);
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillPlanTeam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-team)" stopOpacity={0.34} />
                <stop offset="95%" stopColor="var(--color-team)" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="fillPlanPro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-pro)" stopOpacity={0.34} />
                <stop offset="95%" stopColor="var(--color-pro)" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="fillPlanFree" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-free)" stopOpacity={0.34} />
                <stop offset="95%" stopColor="var(--color-free)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={value => {
                const date = new Date(`${value}T12:00:00`);
                return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={value =>
                    new Date(`${String(value)}T12:00:00`).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="team"
              type="monotone"
              fill="url(#fillPlanTeam)"
              stroke="var(--color-team)"
              stackId="a"
              strokeWidth={1.75}
            />
            <Area
              dataKey="pro"
              type="monotone"
              fill="url(#fillPlanPro)"
              stroke="var(--color-pro)"
              stackId="a"
              strokeWidth={1.75}
            />
            <Area
              dataKey="free"
              type="monotone"
              fill="url(#fillPlanFree)"
              stroke="var(--color-free)"
              stackId="a"
              strokeWidth={1.75}
            />
          </AreaChart>
        </ChartContainer>
        <div className="internal-plan-legend internal-chart-card__legend" aria-label="Workspace counts by plan">
          {(
            [
              { plan: "Free", key: "free" as const, index: 0 },
              { plan: "Pro", key: "pro" as const, index: 1 },
              { plan: "Team", key: "team" as const, index: 2 },
            ] as const
          ).map(item => (
            <div key={item.key}>
              <span className={`internal-legend-dot internal-legend-${item.index}`} aria-hidden />
              <span>{item.plan}</span>
              <strong>{counts[item.key]}</strong>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
