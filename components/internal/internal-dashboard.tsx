"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, LockKeyhole, Search, ShieldCheck, Users, Wallet, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InternalSidebar, sections, type InternalSection } from "./internal-sidebar";
import { PlanChart } from "./plan-chart";

type Credits = { period: string; included: number; used: number; reserved: number; available: number };
type User = { id: string; email: string; name: string; status: "active" | "disabled"; personalWorkspaceId: string };
type Workspace = { id: string; name: string; plan: "free" | "pro" | "team"; seatLimit: number; seatsUsed: number;
  ownerId: string; credits: Credits };
type Audit = { id: string; action: string; actorId: string; targetId: string; reason: string; at: number; result: string; credits?: number };
type Overview = { users: User[]; workspaces: Workspace[]; summary: { users: number; workspaces: number;
  activeUsers: number; teamWorkspaces: number; creditsUsed: number }; activity: Audit[]; limited: boolean;
  internalRole: "super_admin" | "support" | "billing" | "operations"; operatorId: string };
type Customer = { user: User; workspaces: (Workspace & { role: string; members: { id: string; name: string; role: string; status: string }[] })[] };
type ActionType = "disable_user" | "enable_user" | "revoke_sessions" | "set_plan" | "grant_credits";

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const planName = { free: "Free", pro: "Pro", team: "Team" };

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "same-origin", cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body as T;
}

function Stat({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string;
  icon: typeof Users; tone: "blue" | "violet" | "teal" | "orange" }) {
  return <Card className={`internal-stat internal-stat-${tone}`}><CardHeader className="pb-0"><CardDescription className="internal-stat-top"><span>{label}</span><span className="internal-stat-icon"><Icon size={18} aria-hidden="true" /></span></CardDescription>
    <CardTitle className="internal-stat-value">{value}</CardTitle></CardHeader><CardContent className="pt-0"><small>{detail}</small></CardContent></Card>;
}

export function InternalDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<InternalSection>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<{ type: ActionType; targetId: string; label: string; plan?: Workspace["plan"] } | null>(null);
  const [reason, setReason] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try { setOverview(await api<Overview>("/api/admin/overview/")); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load the dashboard."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const openCustomer = async (id: string) => {
    setActiveUserId(id); setCustomer(null);
    try { setCustomer(await api<Customer>(`/api/admin/customers/${encodeURIComponent(id)}/`)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load customer."); }
  };

  const submitAction = async () => {
    if (!action || reason.trim().length < 8 || submitting || (action.type === "grant_credits" &&
      (!Number.isSafeInteger(Number(creditAmount) * 1000) || Number(creditAmount) <= 0 || Number(creditAmount) > 100))) return;
    setSubmitting(true);
    try {
      await api("/api/admin/actions/", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: crypto.randomUUID(), type: action.type, targetId: action.targetId,
          reason: reason.trim(), ...(action.plan ? { plan: action.plan } : {}),
          ...(action.type === "grant_credits" ? { credits: Number(creditAmount) } : {}) }) });
      setAction(null); setReason(""); setCreditAmount("");
      await refresh();
      if (activeUserId) await openCustomer(activeUserId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Action failed."); }
    finally { setSubmitting(false); }
  };

  const filteredUsers = useMemo(() => (overview?.users ?? []).filter(user => {
    const target = `${user.name} ${user.email} ${user.id}`.toLowerCase();
    return target.includes(query.trim().toLowerCase());
  }), [overview, query]);
  const planCounts = useMemo(() => ({ free: overview?.workspaces.filter(w => w.plan === "free").length ?? 0,
    pro: overview?.workspaces.filter(w => w.plan === "pro").length ?? 0,
    team: overview?.workspaces.filter(w => w.plan === "team").length ?? 0 }), [overview]);
  return <SidebarProvider className="internal-shell internal-dashboard" style={{
    "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)",
  } as React.CSSProperties}>
    <InternalSidebar section={section} onSectionChange={next => { setSection(next); setActiveUserId(null); setCustomer(null); }} />
    <SidebarInset className="internal-content">
      <header className="internal-topbar"><SidebarTrigger aria-label="Toggle navigation" className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        <div className="internal-crumb">ARIA <span>/</span> Internal <span>/</span> <strong>{sections.find(item => item.id === section)?.label}</strong></div>
        <div className="internal-top-actions"><Badge variant="outline" className="internal-env"><span />{overview?.internalRole.replaceAll("_", " ") || "Restricted access"}</Badge><ShieldCheck size={17} aria-label="Restricted access" /></div></header>
      <main className="internal-main">
        {loading ? <div className="internal-state">Loading ARIA operations…</div> : error && !overview
          ? <div className="internal-state internal-error"><LockKeyhole size={26} /><h1>Internal access unavailable</h1><p>{error}</p><a href="/sign-in/?next=%2Finternal%2F">Sign in</a></div>
          : overview && <>
            <div className="internal-heading"><div><span className="internal-eyebrow">PLATFORM OPERATIONS</span><h1>{sections.find(item => item.id === section)?.label}</h1>
              <p>{section === "overview" ? "Customers, workspaces, and usage at a glance." : section === "customers" ? "Find an account and review its access and usage." : section === "workspaces" ? "Plans, seats, and members across ARIA." : section === "plans" ? "Current entitlements and credit balances." : section === "operations" ? "Live configuration and operator guidance." : "Recent changes made through the internal console."}</p></div>
              <Button variant="outline" onClick={() => void refresh()}>Refresh data <ArrowRight size={16} /></Button></div>
            {error && <div className="internal-alert" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
            {overview.limited && <div className="internal-alert">Showing the first 500 customers or workspaces. Narrow the scope before using totals for reporting.</div>}

            {section === "overview" && <>
              <div className="internal-stats">
                <Stat label="Customers" value={fmt.format(overview.summary.users)} detail={`${fmt.format(overview.summary.activeUsers)} active accounts`} icon={Users} tone="blue" />
                <Stat label="Workspaces" value={fmt.format(overview.summary.workspaces)} detail="Across every plan" icon={Wallet} tone="violet" />
                <Stat label="Team workspaces" value={fmt.format(overview.summary.teamWorkspaces)} detail="Shared plans" icon={ShieldCheck} tone="teal" />
                <Stat label="Credits used" value={fmt.format(overview.summary.creditsUsed)} detail="Current UTC billing period" icon={Wallet} tone="orange" />
              </div>
              <PlanChart counts={planCounts} creditsUsed={overview.summary.creditsUsed} />
              <CustomerTable users={filteredUsers.slice(0, 8)} query={query} setQuery={setQuery} openCustomer={openCustomer}
                title="Customers" count={overview.users.length} viewAll={() => setSection("customers")} />
            </>}
            {section === "customers" && <CustomerTable users={filteredUsers} query={query} setQuery={setQuery} openCustomer={openCustomer}
              title="All customers" count={overview.users.length} />}
            {section === "workspaces" && <WorkspaceTable workspaces={overview.workspaces} users={overview.users} openCustomer={openCustomer} />}
            {section === "plans" && <><div className="internal-stats">
              <Stat label="Free" value={fmt.format(planCounts.free)} detail="Personal workspaces" icon={Users} tone="blue" />
              <Stat label="Pro" value={fmt.format(planCounts.pro)} detail="Individual paid workspaces" icon={Wallet} tone="violet" />
              <Stat label="Team" value={fmt.format(planCounts.team)} detail="Shared workspaces" icon={ShieldCheck} tone="teal" />
              <Stat label="Credits used" value={fmt.format(overview.summary.creditsUsed)} detail="Current UTC billing period" icon={Activity} tone="orange" />
              </div><WorkspaceTable workspaces={overview.workspaces} users={overview.users} openCustomer={openCustomer} credits /></>}
            {section === "activity" && <section className="internal-panel"><div className="internal-panel-heading"><div><h2>Operator actions</h2><p>Who changed what, and why</p></div><Activity size={18} /></div>
              <AuditList activity={overview.activity} /></section>}
            {section === "operations" && <div className="internal-operations"><Card><CardHeader><CardTitle>Operator access</CardTitle><CardDescription>Admin access is checked on every request against verified Cognito subjects.</CardDescription></CardHeader><CardContent><Badge variant="outline">Server enforced</Badge></CardContent></Card>
              <Card><CardHeader><CardTitle>Credit recovery</CardTitle><CardDescription>Pending reservations are reconciled by the scheduled job. Review the job logs for failed settlements.</CardDescription></CardHeader><CardContent><code>npm run admin -- reconcile</code></CardContent></Card>
              <Card><CardHeader><CardTitle>Production setup</CardTitle><CardDescription>AWS resources, quotas, and payment provider state require live verification before launch.</CardDescription></CardHeader><CardContent><span className="text-sm text-muted-foreground">See INTERNAL_ADMIN_SETUP.md in the repository.</span></CardContent></Card></div>}
          </>}
      </main>
    </SidebarInset>
    {activeUserId && <div className="internal-drawer-backdrop" onClick={() => { setActiveUserId(null); setCustomer(null); }}>
      <aside className="internal-drawer" onClick={event => event.stopPropagation()} aria-label="Customer details">
        <div className="internal-drawer-header"><span>Customer profile</span><button onClick={() => { setActiveUserId(null); setCustomer(null); }} aria-label="Close customer details"><X size={20} /></button></div>
        {!customer ? <div className="internal-state">Loading customer…</div> : <>
          <div className="internal-profile"><span className="internal-avatar">{(customer.user.name || customer.user.email).slice(0, 1).toUpperCase()}</span>
            <div><h2>{customer.user.name}</h2><p>{customer.user.email}</p><span className={`internal-pill ${customer.user.status}`}>{customer.user.status}</span></div></div>
          <div className="internal-profile-section"><h3>Workspaces</h3>{customer.workspaces.length === 0 && <p>No active workspace memberships.</p>}
            {customer.workspaces.map(workspace => <div className="internal-workspace-card" key={workspace.id}><div><strong>{workspace.name}</strong><span className="internal-plan">{planName[workspace.plan]}</span></div>
              <p>{workspace.role} · {workspace.seatsUsed}/{workspace.seatLimit} seats</p>
              <div className="internal-credit-line"><span>Credits used</span><strong>{fmt.format(workspace.credits.used)} / {fmt.format(workspace.credits.included)}</strong></div>
              <div className="internal-progress"><span style={{ width: `${Math.min(100, workspace.credits.included ? workspace.credits.used / workspace.credits.included * 100 : 0)}%` }} /></div>
              <div className="internal-member-summary"><span>People</span><strong>{workspace.members.filter(member => member.status === "active").length} active · {workspace.members.filter(member => member.status === "pending").length} invited</strong></div>
              {(overview?.internalRole === "super_admin" || overview?.internalRole === "billing") && <label className="internal-plan-control">Change plan <select value={workspace.plan} onChange={event => setAction({ type: "set_plan", targetId: workspace.id,
                label: `${workspace.name} to ${planName[event.target.value as Workspace["plan"]]}`, plan: event.target.value as Workspace["plan"] })}>
                <option value="free">Free</option><option value="pro">Pro</option><option value="team">Team</option></select></label>}
              {(overview?.internalRole === "super_admin" || overview?.internalRole === "billing") && workspace.ownerId !== overview.operatorId &&
                <button className="internal-grant-button" onClick={() => setAction({ type: "grant_credits", targetId: workspace.id, label: `Grant credits to ${workspace.name}` })}>Grant credits</button>}</div>)}</div>
          {(overview?.internalRole === "super_admin" || overview?.internalRole === "operations") && <div className="internal-profile-section"><h3>Account controls</h3><p>Changes require a reason and are recorded in the audit log.</p>
            <div className="internal-control-buttons"><button onClick={() => setAction({ type: "revoke_sessions", targetId: customer.user.id, label: `Sign out ${customer.user.name} on every device` })}>Revoke sessions</button>
              <button className="danger" onClick={() => setAction({ type: customer.user.status === "active" ? "disable_user" : "enable_user",
                targetId: customer.user.id, label: `${customer.user.status === "active" ? "Disable" : "Enable"} ${customer.user.name}` })}>
                {customer.user.status === "active" ? "Disable account" : "Enable account"}</button></div></div>}
        </>}
      </aside>
    </div>}
    <DialogPrimitive.Root open={Boolean(action)} onOpenChange={open => { if (!open && !submitting) { setAction(null); setReason(""); setCreditAmount(""); } }}>
      <DialogPrimitive.Portal><DialogPrimitive.Overlay className="internal-confirm-overlay" />
        {action && <DialogPrimitive.Content className="internal-confirm">
          <div className="internal-confirm-icon"><LockKeyhole size={22} /></div>
          <DialogPrimitive.Title>Confirm account action</DialogPrimitive.Title>
          <DialogPrimitive.Description>{action.label}</DialogPrimitive.Description>
          {action.type === "grant_credits" && <><label htmlFor="internal-credit-amount">Credits to grant (up to 100)</label>
            <input id="internal-credit-amount" type="number" min="0.001" max="100" step="0.001" value={creditAmount}
              onChange={event => setCreditAmount(event.target.value)} placeholder="10" /></>}
          <label htmlFor="internal-action-reason">Reason for this change</label>
          <textarea id="internal-action-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={500}
            placeholder="Describe the customer request or incident (at least 8 characters)" />
          <div className="internal-confirm-buttons"><button onClick={() => { setAction(null); setReason(""); }} disabled={submitting}>Cancel</button>
            <button onClick={() => void submitAction()} disabled={submitting || reason.trim().length < 8 || (action.type === "grant_credits" &&
              (!Number.isSafeInteger(Number(creditAmount) * 1000) || Number(creditAmount) <= 0 || Number(creditAmount) > 100))}>{submitting ? "Applying…" : "Confirm action"}</button></div>
        </DialogPrimitive.Content>}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  </SidebarProvider>;
}

function AuditList({ activity }: { activity: Audit[] }) {
  return activity.length ? <ol className="internal-audit-list">{activity.map(entry => <li key={entry.id}><div className="internal-event-icon"><Activity size={16} /></div>
    <div><strong>{entry.action.replaceAll("_", " ")}{entry.credits ? ` · ${fmt.format(entry.credits)} credits` : ""}</strong><p>{entry.reason}</p><small>{dateFmt.format(entry.at)} · by {entry.actorId}</small></div></li>)}</ol>
    : <div className="internal-empty">No operator actions yet.</div>;
}

function WorkspaceTable({ workspaces, users, openCustomer, credits = false }: { workspaces: Workspace[]; users: User[];
  openCustomer: (id: string) => void; credits?: boolean }) {
  const ownerName = (id: string) => users.find(user => user.id === id)?.name || id;
  return <section className="internal-panel internal-customers"><div className="internal-panel-heading"><div><h2>{credits ? "Credit balances" : "All workspaces"}</h2>
    <p>{workspaces.length} workspaces in this view</p></div></div>
    <div className="internal-table-wrap"><Table><TableHeader><TableRow><TableHead>Workspace</TableHead><TableHead>Owner</TableHead><TableHead>Plan</TableHead><TableHead>Seats</TableHead><TableHead>{credits ? "Available credits" : "Credits used"}</TableHead></TableRow></TableHeader><TableBody>
    {workspaces.map(workspace => <TableRow key={workspace.id}><TableCell><strong>{workspace.name}</strong><small className="internal-workspace-id">{workspace.id}</small></TableCell>
      <TableCell><button className="internal-owner-link" onClick={() => void openCustomer(workspace.ownerId)}>{ownerName(workspace.ownerId)}</button></TableCell>
      <TableCell><Badge variant="outline">{planName[workspace.plan]}</Badge></TableCell><TableCell>{workspace.seatsUsed} / {workspace.seatLimit}</TableCell>
      <TableCell>{fmt.format(credits ? workspace.credits.available : workspace.credits.used)}</TableCell></TableRow>)}
    </TableBody></Table>{workspaces.length === 0 && <div className="internal-empty">No workspaces found.</div>}</div></section>;
}

function CustomerTable({ users, query, setQuery, openCustomer, title, count, viewAll }: { users: User[]; query: string;
  setQuery: (value: string) => void; openCustomer: (id: string) => void; title: string; count: number; viewAll?: () => void }) {
  return <section className="internal-panel internal-customers"><div className="internal-panel-heading"><div><h2>{title}</h2><p>{count} accounts in this view</p></div>
    {viewAll && <button className="internal-view-all" onClick={viewAll}>View all <ArrowRight size={15} /></button>}</div>
    <div className="internal-table-toolbar"><Search size={17} /><input aria-label="Search customers" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email, or user ID" /></div>
    <div className="internal-table-wrap"><Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Account status</TableHead><TableHead>User ID</TableHead><TableHead aria-label="Open" /></TableRow></TableHeader><TableBody>
      {users.map(user => <TableRow key={user.id} onClick={() => void openCustomer(user.id)}><TableCell><div className="internal-customer-cell"><span className="internal-avatar small">{(user.name || user.email).slice(0, 1).toUpperCase()}</span>
        <div><strong>{user.name}</strong><small>{user.email}</small></div></div></TableCell><TableCell><span className={`internal-pill ${user.status}`}>{user.status}</span></TableCell>
        <TableCell className="internal-id">{user.id}</TableCell><TableCell><button className="internal-row-open" aria-label={`Open ${user.name}`} onClick={event => { event.stopPropagation(); void openCustomer(user.id); }}><ArrowRight size={17} /></button></TableCell></TableRow>)}
    </TableBody></Table>{users.length === 0 && <div className="internal-empty">No customers match this search.</div>}</div></section>;
}
