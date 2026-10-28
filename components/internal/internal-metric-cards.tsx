import { Activity, ShieldCheck, Users, Wallet } from "lucide-react";
import { InternalKpiCard } from "./internal-kpi-card";

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function InternalMetricCards({
  summary,
}: {
  summary: {
    users: number;
    workspaces: number;
    activeUsers: number;
    teamWorkspaces: number;
    creditsUsed: number;
  };
}) {
  return (
    <div className="internal-kpi-grid">
      <InternalKpiCard
        index={0}
        label="Customers"
        value={summary.users}
        format={n => fmt.format(Math.round(n))}
        footerTitle={`${fmt.format(summary.activeUsers)} active`}
        footerDetail="Indexed accounts"
        icon={Users}
        tone="blue"
      />
      <InternalKpiCard
        index={1}
        label="Workspaces"
        value={summary.workspaces}
        format={n => fmt.format(Math.round(n))}
        footerTitle="All plans"
        footerDetail="In this snapshot"
        icon={Wallet}
        tone="violet"
      />
      <InternalKpiCard
        index={2}
        label="Team workspaces"
        value={summary.teamWorkspaces}
        format={n => fmt.format(Math.round(n))}
        footerTitle="Shared plans"
        footerDetail="Team entitlement"
        icon={ShieldCheck}
        tone="teal"
      />
      <InternalKpiCard
        index={3}
        label="Credits this period"
        value={summary.creditsUsed}
        format={n => fmt.format(n)}
        footerTitle="Current UTC month"
        footerDetail="From workspace ledgers"
        icon={Activity}
        tone="orange"
      />
    </div>
  );
}
