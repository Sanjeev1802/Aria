"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InternalCustomerAction } from "./internal-customer-profile-panel";
import { internalRoleCapabilities } from "./internal-operator-role";
import type { InternalRole } from "./internal-operator-role";
import {
  InternalOperatorActivityList,
  type OperatorAuditEntry,
} from "./internal-operator-activity-list";

type Credits = { period: string; included: number; used: number; reserved: number; available: number };
type User = { id: string; email: string; name: string; status: "active" | "disabled"; aiAccessSuspended?: boolean };
type Workspace = {
  id: string;
  name: string;
  plan: "free" | "pro" | "team";
  seatLimit: number;
  seatsUsed: number;
  ownerId: string;
  credits: Credits;
};

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const planName = { free: "Free", pro: "Pro", team: "Team" };

export function InternalSettingsTeamsPanel({
  workspaces,
  users,
  activity,
  operatorRole,
  dataLimited,
  onOpenCustomer,
  onRequestAction,
  onViewAllActivity,
}: {
  workspaces: Workspace[];
  users: User[];
  activity: OperatorAuditEntry[];
  operatorRole: InternalRole;
  dataLimited: boolean;
  onOpenCustomer: (ownerId: string) => void;
  onRequestAction: (action: InternalCustomerAction) => void;
  onViewAllActivity: () => void;
}) {
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState<"all" | Workspace["plan"]>("all");
  const [ownerStatus, setOwnerStatus] = useState<"all" | User["status"]>("all");

  const canAccountControls = internalRoleCapabilities(operatorRole).accountControls;
  const isSuperAdmin = operatorRole === "super_admin";

  const userById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspaces.filter(workspace => {
      if (plan !== "all" && workspace.plan !== plan) return false;
      const owner = userById.get(workspace.ownerId);
      if (ownerStatus !== "all" && owner?.status !== ownerStatus) return false;
      if (!q) return true;
      const ownerText = owner ? `${owner.name} ${owner.email}`.toLowerCase() : "";
      return (
        workspace.name.toLowerCase().includes(q) ||
        workspace.id.toLowerCase().includes(q) ||
        ownerText.includes(q)
      );
    });
  }, [workspaces, query, plan, ownerStatus, userById]);

  const summary = useMemo(() => {
    const ownerIds = new Set(filtered.map(w => w.ownerId));
    let activeOwners = 0;
    let disabledOwners = 0;
    for (const id of ownerIds) {
      const status = userById.get(id)?.status;
      if (status === "disabled") disabledOwners += 1;
      else activeOwners += 1;
    }
    const creditsUsed = filtered.reduce((sum, w) => sum + w.credits.used, 0);
    return { workspaces: filtered.length, creditsUsed, activeOwners, disabledOwners };
  }, [filtered, userById]);

  const targetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const w of filtered) {
      ids.add(w.id);
      ids.add(w.ownerId);
    }
    return ids;
  }, [filtered]);

  const filteredActivity = useMemo(
    () => activity.filter(entry => targetIds.has(entry.targetId)).slice(0, 10),
    [activity, targetIds],
  );

  return (
    <div className="internal-settings-teams">
      <div className="internal-settings-teams__summary grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card px-4 py-3 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Workspaces shown</p>
          <p className="text-xl font-semibold tabular-nums">{fmt.format(summary.workspaces)}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Credits used (snapshot)</p>
          <p className="text-xl font-semibold tabular-nums">{fmt.format(summary.creditsUsed)}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Active owners</p>
          <p className="text-xl font-semibold tabular-nums">{fmt.format(summary.activeOwners)}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Disabled owners</p>
          <p className="text-xl font-semibold tabular-nums">{fmt.format(summary.disabledOwners)}</p>
        </div>
      </div>

      {dataLimited ? (
        <p className="text-xs text-muted-foreground">
          Totals reflect filtered rows from the indexed snapshot (up to 500 workspaces per load).
        </p>
      ) : null}

      <section className="internal-panel internal-customers overflow-hidden rounded-lg border bg-card shadow-xs">
        <div className="internal-filter-row border-b">
          <label className="internal-table-toolbar">
            <Search size={17} aria-hidden />
            <input
              aria-label="Search workspaces or owners"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search workspace or owner"
            />
          </label>
          <label className="internal-filter-select">
            Plan{" "}
            <select
              aria-label="Filter by plan"
              value={plan}
              onChange={event => setPlan(event.target.value as typeof plan)}
            >
              <option value="all">All plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
            </select>
          </label>
          <label className="internal-filter-select">
            Owner{" "}
            <select
              aria-label="Filter by owner account status"
              value={ownerStatus}
              onChange={event => setOwnerStatus(event.target.value as typeof ownerStatus)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
        </div>
        <div className="internal-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Owner status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Seats</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead className="text-right w-[148px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(workspace => {
                const owner = userById.get(workspace.ownerId);
                const status = owner?.status ?? "active";
                const aiOn = status === "active" && !owner?.aiAccessSuspended;
                return (
                  <TableRow key={workspace.id}>
                    <TableCell>
                      <strong>{workspace.name}</strong>
                      <small className="internal-workspace-id block">{workspace.id}</small>
                    </TableCell>
                    <TableCell>
                      {owner ? (
                        <>
                          <span className="block font-medium">{owner.name}</span>
                          <span className="block text-xs text-muted-foreground">{owner.email}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">{workspace.ownerId}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status === "active" ? "secondary" : "destructive"} className="capitalize">
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{planName[workspace.plan]}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {workspace.seatsUsed} / {workspace.seatLimit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {fmt.format(workspace.credits.used)}
                      <span className="text-muted-foreground"> / {fmt.format(workspace.credits.included)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="internal-settings-teams__actions">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 shadow-none"
                          onClick={() => onOpenCustomer(workspace.ownerId)}
                        >
                          View account
                        </Button>
                        {canAccountControls && owner && aiOn ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-8 shadow-none"
                            onClick={() =>
                              onRequestAction({
                                type: "disable_user",
                                targetId: owner.id,
                                label: `Suspend ARIA AI for ${owner.name}`,
                              })
                            }
                          >
                            Pause AI
                          </Button>
                        ) : null}
                        {isSuperAdmin && owner && !aiOn ? (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="h-8 shadow-none"
                            onClick={() =>
                              onRequestAction({
                                type: "enable_user",
                                targetId: owner.id,
                                label: `Enable ${owner.name}`,
                              })
                            }
                          >
                            Enable
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 ? (
            <div className="internal-empty p-6">No workspaces match these filters.</div>
          ) : null}
        </div>
      </section>

      <section className="internal-panel overflow-hidden rounded-lg border bg-card shadow-xs">
        <div className="internal-panel-heading border-b px-4 py-3 sm:px-6">
          <h2 className="text-sm font-semibold">Related audit activity</h2>
          <p className="text-xs text-muted-foreground">
            Latest changes for owners and workspaces in the filtered list
          </p>
        </div>
        {filteredActivity.length > 0 ? (
          <InternalOperatorActivityList activity={filteredActivity} />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">No audit entries match the current filters.</p>
        )}
        <div className="internal-panel-footer border-t">
          <button type="button" className="internal-view-all text-sm font-medium" onClick={onViewAllActivity}>
            Open audit activity
          </button>
        </div>
      </section>
    </div>
  );
}
