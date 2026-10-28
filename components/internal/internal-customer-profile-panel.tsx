"use client";

import type { InternalRole } from "./internal-operator-role";
import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
type Credits = { period: string; included: number; used: number; reserved: number; available: number };
type User = {
  id: string; email: string; name: string; status: "active" | "disabled"; aiAccessSuspended?: boolean;
  personalWorkspaceId: string;
};

function customerAiAccessOn(user: User) {
  if (user.status === "disabled") return false;
  return !user.aiAccessSuspended;
}
type WorkspaceMember = { id: string; name: string; role: string; status: string };
type CustomerWorkspace = {
  id: string;
  name: string;
  plan: "free" | "pro" | "team";
  seatLimit: number;
  seatsUsed: number;
  ownerId: string;
  credits: Credits;
  role: string;
  members: WorkspaceMember[];
};

export type CustomerProfileData = {
  user: User;
  workspaces: CustomerWorkspace[];
};

export type InternalCustomerAction =
  | { type: "disable_user" | "enable_user" | "revoke_sessions"; targetId: string; label: string }
  | { type: "set_plan"; targetId: string; label: string; plan: CustomerWorkspace["plan"] };

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const planName = { free: "Free", pro: "Pro", team: "Team" };
function accountStage(user: User, workspaces: CustomerWorkspace[]) {
  if (!customerAiAccessOn(user)) return 2;
  if (workspaces.length === 0) return 0;
  return 1;
}

function WorkspaceCard({
  workspace,
  canChangePlan,
  onRequestAction,
}: {
  workspace: CustomerWorkspace;
  canChangePlan: boolean;
  onRequestAction: (action: InternalCustomerAction) => void;
}) {
  const pct = workspace.credits.included
    ? Math.min(100, (workspace.credits.used / workspace.credits.included) * 100)
    : 0;

  return (
    <article className="internal-workspace-card">
      <div>
        <strong>{workspace.name}</strong>
        <span className="internal-plan">{planName[workspace.plan]}</span>
      </div>
      <p>
        {workspace.role} · {workspace.seatsUsed}/{workspace.seatLimit} seats
      </p>
      <div className="internal-credit-line">
        <span>Credits used</span>
        <strong>
          {fmt.format(workspace.credits.used)} / {fmt.format(workspace.credits.included)}
        </strong>
      </div>
      <div className="internal-progress" role="meter" aria-valuenow={workspace.credits.used} aria-valuemax={Math.max(workspace.credits.included, 1)}>
        <span style={{ width: `${pct}%` }} />
      </div>
      {workspace.members.length > 0 ? (
        <div className="internal-member-summary">
          <span>Members on record</span>
          <strong>{workspace.members.length}</strong>
        </div>
      ) : null}
      {canChangePlan ? (
        <label className="internal-plan-control">
          Change plan{" "}
          <select
            value={workspace.plan}
            onChange={event =>
              onRequestAction({
                type: "set_plan",
                targetId: workspace.id,
                label: `${workspace.name} to ${planName[event.target.value as CustomerWorkspace["plan"]]}`,
                plan: event.target.value as CustomerWorkspace["plan"],
              })
            }
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="team">Team</option>
          </select>
        </label>
      ) : null}
    </article>
  );
}

function WorkspaceAccessCard({
  workspace,
  canChangePlan,
  onRequestAction,
}: {
  workspace: CustomerWorkspace;
  canChangePlan: boolean;
  onRequestAction: (action: InternalCustomerAction) => void;
}) {
  const pct = workspace.credits.included
    ? Math.min(100, (workspace.credits.used / workspace.credits.included) * 100)
    : 0;

  return (
    <article className="internal-workspace-access-card">
      <header className="internal-workspace-access-card__head">
        <div>
          <h3 className="internal-workspace-access-card__title">{workspace.name}</h3>
          <p className="internal-workspace-access-card__sub">
            {planName[workspace.plan]} · {workspace.role} · {workspace.seatsUsed}/{workspace.seatLimit} seats
          </p>
        </div>
        <span className="internal-plan">{planName[workspace.plan]}</span>
      </header>

      <dl className="internal-workspace-access-card__metrics">
        <div>
          <dt>Used</dt>
          <dd>{fmt.format(workspace.credits.used)}</dd>
        </div>
        <div>
          <dt>Included</dt>
          <dd>{fmt.format(workspace.credits.included)}</dd>
        </div>
        <div>
          <dt>Available</dt>
          <dd>{fmt.format(workspace.credits.available)}</dd>
        </div>
        <div>
          <dt>Period</dt>
          <dd>{workspace.credits.period}</dd>
        </div>
      </dl>
      <div
        className="internal-progress internal-workspace-access-card__progress"
        role="meter"
        aria-valuenow={workspace.credits.used}
        aria-valuemax={Math.max(workspace.credits.included, 1)}
      >
        <span style={{ width: `${pct}%` }} />
      </div>

      <div className="internal-workspace-access-card__form">
        {canChangePlan ? (
          <div className="internal-workspace-access-card__field">
            <Label htmlFor={`plan-${workspace.id}`}>Plan</Label>
            <select
              id={`plan-${workspace.id}`}
              className="internal-workspace-access-card__select"
              value={workspace.plan}
              onChange={event =>
                onRequestAction({
                  type: "set_plan",
                  targetId: workspace.id,
                  label: `${workspace.name} to ${planName[event.target.value as CustomerWorkspace["plan"]]}`,
                  plan: event.target.value as CustomerWorkspace["plan"],
                })
              }
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
            </select>
          </div>
        ) : null}
      </div>

      {workspace.members.length > 0 ? (
        <div className="internal-workspace-access-card__members">
          <h4>Members</h4>
          <ul>
            {workspace.members.map(member => (
              <li key={member.id} className="internal-workspace-access-card__member-row">
                <span className="internal-workspace-access-card__member-name">{member.name}</span>
                <span className="internal-workspace-access-card__member-role">{member.role}</span>
                <span className="internal-workspace-access-card__member-status">{member.status}</span>
              </li>
            ))}
          </ul>
          <p className="internal-workspace-access-card__hint">Credits are shared at the workspace level for all members.</p>
        </div>
      ) : null}
    </article>
  );
}

function CustomerOverviewRow({
  label,
  value,
  mono,
  inline,
}: {
  label: string;
  value: string;
  mono?: boolean;
  /** Short values: label left, value right on one line */
  inline?: boolean;
}) {
  return (
    <div
      className={`internal-customer-overview-sheet__row${inline ? " internal-customer-overview-sheet__row--inline" : ""}`}
    >
      <span className="internal-customer-overview-sheet__label">{label}</span>
      <span
        className={`internal-customer-overview-sheet__value${mono ? " internal-customer-overview-sheet__value--mono" : ""}${inline ? " capitalize" : ""}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

export function InternalCustomerProfilePanel({
  scope = "full",
  customer,
  internalRole,
  fullAccess,
  onClose,
  onRequestAction,
  accountAccessPending = false,
  accountAccessError = "",
}: {
  scope?: "overview" | "full";
  customer: CustomerProfileData;
  internalRole: InternalRole;
  /** Super admins, and admins a super admin granted edit access. Defaults to super admins only. */
  fullAccess?: boolean;
  onClose: () => void;
  onRequestAction: (action: InternalCustomerAction) => void;
  accountAccessPending?: boolean;
  accountAccessError?: string;
}) {
  const overviewOnly = scope === "overview";
  const [tab, setTab] = useState<"workspaces" | "access">("access");

  const { user, workspaces } = customer;
  const aiAccessOn = customerAiAccessOn(user);
  const primary = workspaces.find(w => w.id === user.personalWorkspaceId) ?? workspaces[0];
  const stage = accountStage(user, workspaces);
  const isSuperAdmin = fullAccess ?? internalRole === "super_admin";
  const canBilling = isSuperAdmin || internalRole === "billing";
  const canOperations = isSuperAdmin || internalRole === "operations";
  const showAccountAccess = canOperations;
  const canChangeAccountAccess = isSuperAdmin || (canOperations && aiAccessOn);

  const displayName =
    user.name && user.name.trim().toLowerCase() !== user.email.trim().toLowerCase()
      ? user.name
      : null;

  const stages = [
    { id: "account", label: "Account" },
    { id: "workspaces", label: "Workspaces" },
    { id: "standing", label: aiAccessOn ? "Active" : "AI off" },
  ] as const;

  if (overviewOnly) {
    return (
      <div className="internal-customer-profile internal-customer-overview-sheet">
        <header className="internal-customer-overview-sheet__header">
          <div className="internal-customer-overview-sheet__header-text">
            <h1 className="internal-customer-overview-sheet__title">Customer overview</h1>
            <p className="internal-customer-overview-sheet__subtitle">Account snapshot from the current index</p>
          </div>
          <button type="button" className="internal-customer-overview-sheet__close" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden />
          </button>
        </header>

        <div className="internal-customer-overview-sheet__body">
          <section className="internal-customer-overview-sheet__section">
            <h2 className="internal-customer-overview-sheet__section-title">Account</h2>
            <div className="internal-customer-overview-sheet__fields">
              <CustomerOverviewRow label="Status" value={user.status} inline />
              <CustomerOverviewRow label="User ID" value={user.id} mono />
            </div>
          </section>

          <section className="internal-customer-overview-sheet__section">
            <h2 className="internal-customer-overview-sheet__section-title">Workspace</h2>
            <div className="internal-customer-overview-sheet__fields">
              <CustomerOverviewRow label="Primary workspace" value={primary?.name ?? "—"} />
              <CustomerOverviewRow
                label="Plan"
                value={primary ? planName[primary.plan] : "—"}
                inline
              />
              <CustomerOverviewRow label="Role" value={primary?.role ?? "—"} inline />
              <CustomerOverviewRow label="Memberships" value={String(workspaces.length)} inline />
            </div>
          </section>

          <section className="internal-customer-overview-sheet__section">
            <h2 className="internal-customer-overview-sheet__section-title">Access</h2>
            <div className="internal-customer-overview-sheet__chips">
              {primary ? (
                <span className="internal-customer-overview-sheet__chip">{planName[primary.plan]}</span>
              ) : null}
              {primary ? (
                <span className="internal-customer-overview-sheet__chip">{primary.role}</span>
              ) : null}
              <span className="internal-customer-overview-sheet__chip capitalize">{user.status}</span>
            </div>
          </section>
        </div>

      </div>
    );
  }

  return (
    <div className="internal-customer-profile">
      <header className="internal-drawer-header internal-customer-profile__header">
        <span>Customer profile</span>
        <button type="button" onClick={onClose} aria-label="Close customer details">
          <X size={20} aria-hidden />
        </button>
      </header>

      <div className="internal-customer-profile-drawer">
        <aside className="internal-customer-profile__overview-rail" aria-label="Customer summary">
          <div className="internal-customer-profile__rail-head">
            <span className="internal-customer-profile__rail-avatar" aria-hidden>
              {(displayName || user.email).slice(0, 1).toUpperCase()}
            </span>
            {displayName ? <h2 className="internal-customer-profile__rail-name">{displayName}</h2> : null}
            <p className={`internal-customer-profile__rail-email${displayName ? "" : " internal-customer-profile__rail-email--primary"}`}>
              {user.email}
            </p>
            <p className="internal-customer-profile__rail-meta">
              {primary ? `${planName[primary.plan]} · ${primary.role}` : "No workspace membership"}
            </p>
            <Badge variant="outline" className="internal-customer-profile__rail-badge capitalize">
              {aiAccessOn ? user.status : "AI paused"}
            </Badge>
          </div>

          {primary ? (
            <div className="internal-customer-profile__meta">
              <p className="internal-customer-profile__meta-label">Primary workspace</p>
              <p className="internal-customer-profile__meta-value" title={primary.name}>
                {primary.name}
              </p>
              <p className="internal-customer-profile__meta-hint">{workspaces.length} membership{workspaces.length === 1 ? "" : "s"} total</p>
            </div>
          ) : null}

          <div className="internal-customer-profile__stage" aria-label="Account progress">
            <ol className="internal-customer-stepper">
              {stages.map((item, index) => {
                const active = index <= stage;
                const current = index === stage;
                return (
                  <li
                    key={item.id}
                    className={`internal-customer-stepper__step${active ? " internal-customer-stepper__step--active" : ""}${current ? " internal-customer-stepper__step--current" : ""}`}
                  >
                    {item.label}
                  </li>
                );
              })}
            </ol>
            <p className="internal-customer-profile__stage-caption">
              {!aiAccessOn
                ? isSuperAdmin
                  ? "ARIA AI is off — turn on access below or the customer can subscribe on the pricing page."
                  : "ARIA AI is off — only someone with full edit access can turn it back on."
                : workspaces.length === 0
                  ? "No workspace memberships in this snapshot."
                  : "Customer can sign in and use ARIA AI on their current plan."}
            </p>
          </div>

          {showAccountAccess ? (
            <div className="internal-customer-profile__overview-actions">
              <div className="internal-customer-profile__access-toggle">
                <div className="internal-customer-profile__access-toggle-copy">
                  <Label htmlFor={`customer-access-${user.id}`} className="internal-customer-profile__access-toggle-label">
                    ARIA AI access
                  </Label>
                  <p className="internal-customer-profile__access-toggle-hint">
                    {aiAccessOn
                      ? "Sign-in stays open; chat uses their subscription plan"
                      : isSuperAdmin
                        ? "AI paused — customer can still sign in and view pricing"
                        : "AI paused — full edit access required to turn back on"}
                  </p>
                </div>
                <Switch
                  id={`customer-access-${user.id}`}
                  size="default"
                  checked={aiAccessOn}
                  disabled={!canChangeAccountAccess || accountAccessPending}
                  aria-label={aiAccessOn ? "Suspend ARIA AI access" : "Restore ARIA AI access"}
                  onCheckedChange={checked => {
                    if (!canChangeAccountAccess || checked === aiAccessOn) return;
                    onRequestAction({
                      type: checked ? "enable_user" : "disable_user",
                      targetId: user.id,
                      label: `${checked ? "Enable" : "Disable"} ${user.name}`,
                    });
                  }}
                />
              </div>
              {accountAccessError ? (
                <p className="internal-customer-profile__access-toggle-error" role="alert">
                  {accountAccessError}
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>

        <section className="internal-customer-profile__detail">
          <Tabs value={tab} onValueChange={value => setTab(value as typeof tab)} className="internal-customer-profile__tabs-root gap-0">
            <TabsList variant="line" className="internal-customer-profile__tabs h-10 w-full justify-start rounded-none border-b bg-transparent px-0">
              <TabsTrigger value="workspaces" className="rounded-none px-4">
                Workspaces
              </TabsTrigger>
              <TabsTrigger value="access" className="rounded-none px-4">
                Access & credits
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workspaces" className="internal-customer-profile__panel mt-0">
              <h2 className="internal-operator-profile__content-title internal-customer-profile__tab-title">Workspaces</h2>
              {workspaces.length === 0 ? (
                <p className="internal-customer-profile__empty">No active workspace memberships.</p>
              ) : (
                workspaces.map(workspace => (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    canChangePlan={canBilling}
                    onRequestAction={onRequestAction}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="access" className="internal-customer-profile__panel mt-0">
              <h2 className="internal-operator-profile__content-title internal-customer-profile__tab-title">Access & credits</h2>
              <p className="internal-customer-profile__lede">
                {canBilling
                  ? "Plan changes require a reason in the confirmation step and are written to the audit log."
                  : canOperations
                    ? "ARIA AI access is toggled from the sidebar; sign-in is not blocked."
                    : "Your role can inspect this customer but cannot change plans or AI access."}
              </p>
              {!canBilling && !canOperations ? (
                <p className="internal-customer-profile__empty">Contact a billing or operations operator for account changes.</p>
              ) : workspaces.length === 0 ? (
                <p className="internal-customer-profile__empty">No workspaces to manage in this snapshot.</p>
              ) : (
                <div className="internal-customer-profile__access-list">
                  {workspaces.map(workspace => (
                    <WorkspaceAccessCard
                      key={workspace.id}
                      workspace={workspace}
                      canChangePlan={canBilling}
                      onRequestAction={onRequestAction}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}
