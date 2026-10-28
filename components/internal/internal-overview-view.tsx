"use client";

import { InternalMetricCards } from "./internal-metric-cards";
import { PlanChart } from "./plan-chart";
import { UsageAnalytics } from "./usage-analytics";
import { Card } from "@/components/ui/card";

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
      <section className="internal-section" aria-labelledby="internal-platform-heading">
        <header className="internal-section__head">
          <div>
            <h2 id="internal-platform-heading" className="internal-section__title">Platform</h2>
            <p className="internal-section__sub">Accounts and workspaces in the current snapshot</p>
          </div>
        </header>
        <InternalMetricCards summary={summary} />
      </section>

      <UsageAnalytics />

      <section className="internal-section" aria-labelledby="internal-workspaces-heading">
        <header className="internal-section__head">
          <div>
            <h2 id="internal-workspaces-heading" className="internal-section__title">Workspaces</h2>
            <p className="internal-section__sub">How workspaces are distributed across plans</p>
          </div>
        </header>
        <PlanChart counts={planCounts} workspaces={workspaces} />
      </section>

      <section className="internal-section" aria-labelledby="internal-investigation-heading">
        <header className="internal-section__head">
          <div>
            <h2 id="internal-investigation-heading" className="internal-section__title">Investigation</h2>
            <p className="internal-section__sub">Customers from the current snapshot — open a row for account details</p>
          </div>
        </header>
        <Card className="internal-documents-card overflow-hidden p-0">
          {customersPreview}
        </Card>
      </section>
    </div>
  );
}
