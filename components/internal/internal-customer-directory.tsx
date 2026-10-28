"use client";

import { ArrowRight, Building2, Coins, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type User = {
  id: string; email: string; name: string; status: "active" | "disabled"; aiAccessSuspended?: boolean;
  personalWorkspaceId: string;
};

function customerAccessLabel(user: User) {
  if (user.status === "disabled") return "Sign-in blocked";
  if (user.aiAccessSuspended) return "AI paused";
  return user.status;
}
type Workspace = {
  id: string;
  name: string;
  plan: "free" | "pro" | "team";
  ownerId: string;
  credits: { used: number };
};

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const planName = { free: "Free", pro: "Pro", team: "Team" };

function customerStats(user: User, workspaces: Workspace[]) {
  const owned = workspaces.filter(w => w.ownerId === user.id);
  const personal = workspaces.find(w => w.id === user.personalWorkspaceId) ?? owned[0];
  const creditsUsed = owned.reduce((sum, w) => sum + w.credits.used, 0);
  return {
    ownedCount: owned.length,
    creditsUsed,
    plan: personal?.plan ?? "free",
  };
}

function userMatchesPlan(user: User, workspaces: Workspace[], plan: "all" | Workspace["plan"]) {
  if (plan === "all") return true;
  const owned = workspaces.filter(w => w.ownerId === user.id);
  const personal = workspaces.find(w => w.id === user.personalWorkspaceId);
  return owned.some(w => w.plan === plan) || personal?.plan === plan;
}

export function filterCustomers(
  users: User[],
  workspaces: Workspace[],
  query: string,
  status: "all" | User["status"],
  plan: "all" | Workspace["plan"],
) {
  const q = query.trim().toLowerCase();
  return users.filter(user => {
    const target = `${user.name} ${user.email} ${user.id}`.toLowerCase();
    return (
      target.includes(q)
      && (status === "all"
        || (status === "active" && user.status === "active" && !user.aiAccessSuspended)
        || (status === "disabled" && (user.status === "disabled" || user.aiAccessSuspended)))
      && userMatchesPlan(user, workspaces, plan)
    );
  });
}

export function InternalCustomerDirectory({
  users,
  allUsers,
  workspaces,
  query,
  setQuery,
  status,
  setStatus,
  plan,
  setPlan,
  openCustomer,
  totalLoaded,
}: {
  users: User[];
  allUsers: User[];
  workspaces: Workspace[];
  query: string;
  setQuery: (value: string) => void;
  status: "all" | User["status"];
  setStatus: (value: "all" | User["status"]) => void;
  plan: "all" | Workspace["plan"];
  setPlan: (value: "all" | Workspace["plan"]) => void;
  openCustomer: (id: string) => void;
  totalLoaded: number;
}) {
  const matchCount = filterCustomers(allUsers, workspaces, query, status, plan).length;

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
    setPlan("all");
  };

  return (
    <section className="internal-customer-directory">
      <div className="internal-customer-filters">
        <div className="internal-customer-filters__grid">
          <label className="internal-customer-field">
            <span>Customer name</span>
            <input
              type="text"
              aria-label="Customer name or email"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Enter name, email, or ID"
            />
          </label>
          <label className="internal-customer-field">
            <span>Plan</span>
            <select
              aria-label="Filter by workspace plan"
              value={plan}
              onChange={event => setPlan(event.target.value as "all" | Workspace["plan"])}
            >
              <option value="all">All</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
            </select>
          </label>
          <label className="internal-customer-field">
            <span>Status</span>
            <select
              aria-label="Filter by account status"
              value={status}
              onChange={event => setStatus(event.target.value as "all" | User["status"])}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="disabled">AI paused / blocked</option>
            </select>
          </label>
        </div>
        <div className="internal-customer-filters__actions">
          <Button type="button" variant="outline" size="sm" className="shadow-none" onClick={resetFilters}>
            Clear
          </Button>
          <Button type="button" size="sm" className="internal-customer-search-btn shadow-none">
            Search
          </Button>
        </div>
      </div>

      <div className="internal-customer-results-head">
        <p className="internal-customer-match-count">
          <strong>{matchCount.toLocaleString()}</strong>{" "}
          {matchCount === 1 ? "customer matches" : "customers match"} your criteria
          <span className="text-muted-foreground"> · {totalLoaded.toLocaleString()} loaded in this snapshot</span>
        </p>
      </div>

      {users.length === 0 ? (
        <div className="internal-customer-empty">No customers match these filters.</div>
      ) : (
        <ul className="internal-customer-grid">
          {users.map(user => {
            const stats = customerStats(user, workspaces);
            return (
              <li key={user.id} className="internal-customer-card">
                <div className="internal-customer-card__corner" aria-hidden />
                <div className="internal-customer-card__body">
                  <span className="internal-customer-card__avatar" aria-hidden>
                    {(user.name || user.email).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="internal-customer-card__main">
                    <div className="internal-customer-card__title-row">
                      <h3>{user.name || user.email}</h3>
                      <Badge variant="outline" className="internal-customer-card__status capitalize">
                        {customerAccessLabel(user)}
                      </Badge>
                    </div>
                    <p className="internal-customer-card__email">{user.email}</p>
                    <dl className="internal-customer-card__metrics">
                      <div>
                        <dt>
                          <Building2 aria-hidden />
                          Workspaces
                        </dt>
                        <dd>{stats.ownedCount}</dd>
                      </div>
                      <div>
                        <dt>
                          <Coins aria-hidden />
                          Credits used
                        </dt>
                        <dd>{fmt.format(stats.creditsUsed)}</dd>
                      </div>
                      <div>
                        <dt>
                          <UserPlus aria-hidden />
                          Plan
                        </dt>
                        <dd>{planName[stats.plan]}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
                <div className="internal-customer-card__actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 shadow-none"
                    onClick={() => void openCustomer(user.id)}
                  >
                    View profile
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="shadow-none"
                    aria-label={`Open ${user.name || user.email}`}
                    onClick={() => void openCustomer(user.id)}
                  >
                    <ArrowRight aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
