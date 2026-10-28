import { Activity } from "lucide-react";
import { internalAuditActionLabel, normalizeInternalAuditReason } from "@/lib/internal-audit-copy";

export type OperatorAuditEntry = {
  id: string;
  action: string;
  actorId: string;
  targetId: string;
  reason: string;
  at: number;
  result: string;
  credits?: number;
};

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function InternalOperatorActivityList({ activity }: { activity: OperatorAuditEntry[] }) {
  if (activity.length === 0) {
    return <p className="internal-audit-empty">No operator actions in this window.</p>;
  }
  return (
    <ol className="internal-audit-list">
      {activity.map(entry => (
        <li key={entry.id}>
          <span className="internal-event-icon">
            <Activity size={14} aria-hidden />
          </span>
          <div>
            <strong>
              {internalAuditActionLabel(entry.action)}
              {entry.credits != null ? ` · ${fmt.format(entry.credits)} credits` : ""}
            </strong>
            <p>{normalizeInternalAuditReason(entry.reason)}</p>
            <small>
              {dateFmt.format(entry.at)} · {entry.result} ·{" "}
              {entry.action === "set_plan" || entry.action === "grant_credits" ? "workspace" : "customer"}{" "}
              {entry.targetId.slice(0, 8)}…
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}
