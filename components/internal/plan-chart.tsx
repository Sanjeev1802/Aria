"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = { workspaces: { label: "Workspaces", color: "#5b7cf3" } } satisfies ChartConfig;

export function PlanChart({ counts, creditsUsed }: {
  counts: { free: number; pro: number; team: number }; creditsUsed: number;
}) {
  const data = [
    { plan: "Free", workspaces: counts.free },
    { plan: "Pro", workspaces: counts.pro },
    { plan: "Team", workspaces: counts.team },
  ];
  return <Card className="internal-chart-card">
    <CardHeader><CardTitle>Workspace distribution</CardTitle>
      <CardDescription>Current workspaces by ARIA plan</CardDescription>
      <CardAction><Badge variant="outline">{creditsUsed.toLocaleString("en-US", { maximumFractionDigits: 2 })} credits used this month</Badge></CardAction>
    </CardHeader>
    <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
      <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
        <BarChart data={data} margin={{ left: 0, right: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="plan" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="workspaces" radius={[6, 6, 0, 0]} maxBarSize={96} isAnimationActive={false}>
            <Cell fill="#5b7cf3" /><Cell fill="#a56cef" /><Cell fill="#23b7a1" />
          </Bar>
        </BarChart>
      </ChartContainer>
    </CardContent>
  </Card>;
}
