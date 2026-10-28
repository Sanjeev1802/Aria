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
    <div className="internal-stats grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <InternalKpiCard
        label="Customers"
        value={fmt.format(summary.users)}
        footerTitle="Indexed accounts"
        footerDetail={`${fmt.format(summary.activeUsers)} active`}
        icon={Users}
        tone="blue"
      />
      <InternalKpiCard
        label="Workspaces"
        value={fmt.format(summary.workspaces)}
        footerTitle="All plans"
        footerDetail="In this snapshot"
        icon={Wallet}
        tone="violet"
      />
      <InternalKpiCard
        label="Team workspaces"
        value={fmt.format(summary.teamWorkspaces)}
        footerTitle="Shared plans"
        footerDetail="Team entitlement"
        icon={ShieldCheck}
        tone="teal"
      />
      <InternalKpiCard
        label="Credits used"
        value={fmt.format(summary.creditsUsed)}
        footerTitle="Current UTC billing period"
        footerDetail="Summed from workspace ledgers"
        icon={Activity}
        tone="orange"
      />
    </div>
  );
}
