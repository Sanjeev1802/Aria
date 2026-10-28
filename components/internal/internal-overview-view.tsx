"use client";

import { InternalMetricCards } from "./internal-metric-cards";
import { PlanChart } from "./plan-chart";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type OverviewWorkspace = { plan: "free" | "pro" | "team"; createdAt?: number };

export function InternalOverviewView({
  summary,
  planCounts,
  workspaces,
  customersPreview,
}: {
  summary: {
    users: number;
    workspaces: number;
    activeUsers: number;
    teamWorkspaces: number;
    creditsUsed: number;
  };
  planCounts: { free: number; pro: number; team: number };
  workspaces: OverviewWorkspace[];
  customersPreview: React.ReactNode;
}) {
  return (
    <div className="internal-overview internal-page-stack">
      <InternalMetricCards summary={summary} />

      <PlanChart counts={planCounts} workspaces={workspaces} />

      <Card className="internal-documents-card overflow-hidden p-0 shadow-xs">
        <CardHeader className="internal-card-header border-b pb-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">Investigation</CardTitle>
            <CardDescription>Customers from the current snapshot — open a row for account details.</CardDescription>
          </div>
        </CardHeader>
        {customersPreview}
      </Card>
    </div>
  );
}
