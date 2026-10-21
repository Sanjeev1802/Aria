"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, BarChart3, ExternalLink,
  LayoutDashboard, LockKeyhole, Menu, Search, ShieldCheck, Users, Wallet, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { AriaMark } from "@/components/aria-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Credits = { period: string; included: number; used: number; reserved: number; available: number };
type User = { id: string; email: string; name: string; status: "active" | "disabled"; personalWorkspaceId: string };
type Workspace = { id: string; name: string; plan: "free" | "pro" | "team"; seatLimit: number; seatsUsed: number;
  ownerId: string; credits: Credits };
type Audit = { id: string; action: string; actorId: string; targetId: string; reason: string; at: number; result: string };
type Overview = { users: User[]; workspaces: Workspace[]; summary: { users: number; workspaces: number;
  activeUsers: number; teamWorkspaces: number; creditsUsed: number }; activity: Audit[]; limited: boolean };
type Customer = { user: User; workspaces: (Workspace & { role: string; members: { id: string; name: string; role: string; status: string }[] })[] };
type ActionType = "disable_user" | "enable_user" | "revoke_sessions" | "set_plan";

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const planName = { free: "Free", pro: "Pro", team: "Team" };

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "same-origin", cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body as T;
}

function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string;
  icon: typeof Users }) {
  return <Card className="internal-stat"><CardHeader className="pb-0"><CardDescription className="internal-stat-top"><span>{label}</span><Icon size={18} aria-hidden="true" /></CardDescription>
    <CardTitle className="internal-stat-value">{value}</CardTitle></CardHeader><CardContent className="pt-0"><small>{detail}</small></CardContent></Card>;
}

export function InternalDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<"overview" | "customers" | "workspaces" | "plans" | "activity" | "operations">("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<{ type: ActionType; targetId: string; label: string; plan?: Workspace["plan"] } | null>(null);
  const [reason, setReason] = useState("");
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
    if (!action || reason.trim().length < 8 || submitting) return;
    setSubmitting(true);
    try {
      await api("/api/admin/actions/", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: crypto.randomUUID(), type: action.type, targetId: action.targetId,
          reason: reason.trim(), ...(action.plan ? { plan: action.plan } : {}) }) });
      setAction(null); setReason("");
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
  const maxPlanCount = Math.max(1, ...Object.values(planCounts));

  const nav = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "customers" as const, label: "Customers", icon: Users },
    { id: "workspaces" as const, label: "Workspaces", icon: LayoutDashboard },
    { id: "plans" as const, label: "Plans & credits", icon: Wallet },
    { id: "activity" as const, label: "Audit activity", icon: Activity },
    { id: "operations" as const, label: "Operations", icon: ShieldCheck },
  ];

  return <div className="internal-shell">
    <aside className={`internal-sidebar ${mobileNav ? "is-open" : ""}`}>
      <div className="internal-brand"><AriaMark className="internal-brand-mark" /><div><strong>ARIA</strong><span>INTERNAL</span></div>
        <button className="internal-mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={19} /></button></div>
      <div className="internal-nav-label">WORKSPACE</div>
      <nav aria-label="Internal navigation">{nav.map(item => <button key={item.id} className={`internal-nav-item ${section === item.id ? "active" : ""}`}
        onClick={() => { setSection(item.id); setMobileNav(false); setActiveUserId(null); setCustomer(null); }}>
        <item.icon size={18} aria-hidden="true" />{item.label}{section === item.id && <span className="internal-active-dot" />}</button>)}</nav>
      <div className="internal-side-bottom"><div className="internal-guard"><ShieldCheck size={17} /> Restricted operator access</div>
        <a href="/chat/" className="internal-back">Return to ARIA <ExternalLink size={14} /></a></div>
    </aside>
    {mobileNav && <button className="internal-backdrop" aria-label="Dismiss navigation" onClick={() => setMobileNav(false)} />}
    <div className="internal-content">
      <header className="internal-topbar"><button className="internal-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={21} /></button>
        <div className="internal-crumb">ARIA <span>/</span> Internal <span>/</span> <strong>{nav.find(item => item.id === section)?.label}</strong></div>
        <div className="internal-top-actions"><Badge variant="outline" className="internal-env"><span />Restricted access</Badge><ShieldCheck size={17} aria-label="Restricted access" /></div></header>
      <main className="internal-main">
        {loading ? <div className="internal-state">Loading ARIA operations…</div> : error && !overview
          ? <div className="internal-state internal-error"><LockKeyhole size={26} /><h1>Internal access unavailable</h1><p>{error}</p><a href="/sign-in/?next=%2Finternal%2F">Sign in</a></div>
          : overview && <>
            <div className="internal-heading"><div><span className="internal-eyebrow">PLATFORM OPERATIONS</span><h1>{nav.find(item => item.id === section)?.label}</h1>
              <p>{section === "overview" ? "Customers, workspaces, and usage at a glance." : section === "customers" ? "Find an account and review its access and usage." : section === "workspaces" ? "Plans, seats, and members across ARIA." : section === "plans" ? "Current entitlements and credit balances." : section === "operations" ? "Live configuration and operator guidance." : "Recent changes made through the internal console."}</p></div>
              <Button variant="outline" onClick={() => void refresh()}>Refresh data <ArrowRight size={16} /></Button></div>
            {error && <div className="internal-alert" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
            {overview.limited && <div className="internal-alert">Showing the first 500 customers or workspaces. Narrow the scope before using totals for reporting.</div>}

            {section === "overview" && <>
              <div className="internal-stats">
                <Stat label="Customers" value={fmt.format(overview.summary.users)} detail={`${fmt.format(overview.summary.activeUsers)} active accounts`} icon={Users} />
                <Stat label="Workspaces" value={fmt.format(overview.summary.workspaces)} detail="Across every plan" icon={LayoutDashboard} />
                <Stat label="Team workspaces" value={fmt.format(overview.summary.teamWorkspaces)} detail="Shared plans" icon={ShieldCheck} />
                <Stat label="Credits used" value={fmt.format(overview.summary.creditsUsed)} detail="Current UTC billing period" icon={Wallet} />
              </div>
              <div className="internal-grid-two">
                <section className="internal-panel"><div className="internal-panel-heading"><div><h2>Plan distribution</h2><p>Workspaces by current plan</p></div><BarChart3 size={18} /></div>
                  <div className="internal-bars">{(["free", "pro", "team"] as const).map(plan => <div className="internal-bar-row" key={plan}>
                    <span>{planName[plan]}</span><div className="internal-bar-track"><div className={`internal-bar-fill ${plan}`} style={{ width: `${planCounts[plan] / maxPlanCount * 100}%` }} /></div>
                    <strong>{planCounts[plan]}</strong></div>)}</div></section>
                <section className="internal-panel"><div className="internal-panel-heading"><div><h2>Recent activity</h2><p>Account actions with an audit trail</p></div><Activity size={18} /></div>
                  <AuditList activity={overview.activity.slice(0, 4)} /></section>
              </div>
              <CustomerTable users={filteredUsers.slice(0, 8)} query={query} setQuery={setQuery} openCustomer={openCustomer}
                title="Customers" count={overview.users.length} viewAll={() => setSection("customers")} />
            </>}
            {section === "customers" && <CustomerTable users={filteredUsers} query={query} setQuery={setQuery} openCustomer={openCustomer}
              title="All customers" count={overview.users.length} />}
            {section === "workspaces" && <WorkspaceTable workspaces={overview.workspaces} users={overview.users} openCustomer={openCustomer} />}
            {section === "plans" && <><div className="internal-stats">
              <Stat label="Free" value={fmt.format(planCounts.free)} detail="Personal workspaces" icon={Users} />
              <Stat label="Pro" value={fmt.format(planCounts.pro)} detail="Individual paid workspaces" icon={Wallet} />
              <Stat label="Team" value={fmt.format(planCounts.team)} detail="Shared workspaces" icon={ShieldCheck} />
              <Stat label="Credits used" value={fmt.format(overview.summary.creditsUsed)} detail="Current UTC billing period" icon={Activity} />
              </div><WorkspaceTable workspaces={overview.workspaces} users={overview.users} openCustomer={openCustomer} credits /></>}
            {section === "activity" && <section className="internal-panel"><div className="internal-panel-heading"><div><h2>Operator actions</h2><p>Who changed what, and why</p></div><Activity size={18} /></div>
              <AuditList activity={overview.activity} /></section>}
            {section === "operations" && <div className="internal-operations"><Card><CardHeader><CardTitle>Operator access</CardTitle><CardDescription>Admin access is checked on every request against verified Cognito subjects.</CardDescription></CardHeader><CardContent><Badge variant="outline">Server enforced</Badge></CardContent></Card>
              <Card><CardHeader><CardTitle>Credit recovery</CardTitle><CardDescription>Pending reservations are reconciled by the scheduled job. Review the job logs for failed settlements.</CardDescription></CardHeader><CardContent><code>npm run admin -- reconcile</code></CardContent></Card>
              <Card><CardHeader><CardTitle>Production setup</CardTitle><CardDescription>AWS resources, quotas, and payment provider state require live verification before launch.</CardDescription></CardHeader><CardContent><span className="text-sm text-muted-foreground">See INTERNAL_ADMIN_SETUP.md in the repository.</span></CardContent></Card></div>}
          </>}
      </main>
    </div>
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
              <label className="internal-plan-control">Change plan <select value={workspace.plan} onChange={event => setAction({ type: "set_plan", targetId: workspace.id,
                label: `${workspace.name} to ${planName[event.target.value as Workspace["plan"]]}`, plan: event.target.value as Workspace["plan"] })}>
                <option value="free">Free</option><option value="pro">Pro</option><option value="team">Team</option></select></label></div>)}</div>
          <div className="internal-profile-section"><h3>Account controls</h3><p>Changes require a reason and are recorded in the audit log.</p>
            <div className="internal-control-buttons"><button onClick={() => setAction({ type: "revoke_sessions", targetId: customer.user.id, label: `Sign out ${customer.user.name} on every device` })}>Revoke sessions</button>
              <button className="danger" onClick={() => setAction({ type: customer.user.status === "active" ? "disable_user" : "enable_user",
                targetId: customer.user.id, label: `${customer.user.status === "active" ? "Disable" : "Enable"} ${customer.user.name}` })}>
                {customer.user.status === "active" ? "Disable account" : "Enable account"}</button></div></div>
        </>}
      </aside>
    </div>}
    <DialogPrimitive.Root open={Boolean(action)} onOpenChange={open => { if (!open && !submitting) { setAction(null); setReason(""); } }}>
      <DialogPrimitive.Portal><DialogPrimitive.Overlay className="internal-confirm-overlay" />
        {action && <DialogPrimitive.Content className="internal-confirm">
          <div className="internal-confirm-icon"><LockKeyhole size={22} /></div>
          <DialogPrimitive.Title>Confirm account action</DialogPrimitive.Title>
          <DialogPrimitive.Description>{action.label}</DialogPrimitive.Description>
          <label htmlFor="internal-action-reason">Reason for this change</label>
          <textarea id="internal-action-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={500}
            placeholder="Describe the customer request or incident (at least 8 characters)" />
          <div className="internal-confirm-buttons"><button onClick={() => { setAction(null); setReason(""); }} disabled={submitting}>Cancel</button>
            <button onClick={() => void submitAction()} disabled={submitting || reason.trim().length < 8}>{submitting ? "Applying…" : "Confirm action"}</button></div>
        </DialogPrimitive.Content>}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  </div>;
}

function AuditList({ activity }: { activity: Audit[] }) {
  return activity.length ? <ol className="internal-audit-list">{activity.map(entry => <li key={entry.id}><div className="internal-event-icon"><Activity size={16} /></div>
    <div><strong>{entry.action.replaceAll("_", " ")}</strong><p>{entry.reason}</p><small>{dateFmt.format(entry.at)} · by {entry.actorId}</small></div></li>)}</ol>
    : <div className="internal-empty">No operator actions yet.</div>;
}

function WorkspaceTable({ workspaces, users, openCustomer, credits = false }: { workspaces: Workspace[]; users: User[];
  openCustomer: (id: string) => void; credits?: boolean }) {
  const ownerName = (id: string) => users.find(user => user.id === id)?.name || id;
  return <section className="internal-panel internal-customers"><div className="internal-panel-heading"><div><h2>{credits ? "Credit balances" : "All workspaces"}</h2>
    <p>{workspaces.length} workspaces in this view</p></div></div>
    <div className="internal-table-wrap"><table><thead><tr><th>Workspace</th><th>Owner</th><th>Plan</th><th>Seats</th><th>{credits ? "Available credits" : "Credits used"}</th></tr></thead><tbody>
    {workspaces.map(workspace => <tr key={workspace.id}><td><strong>{workspace.name}</strong><small className="internal-workspace-id">{workspace.id}</small></td>
      <td><button className="internal-owner-link" onClick={() => void openCustomer(workspace.ownerId)}>{ownerName(workspace.ownerId)}</button></td>
      <td><Badge variant="outline">{planName[workspace.plan]}</Badge></td><td>{workspace.seatsUsed} / {workspace.seatLimit}</td>
      <td>{fmt.format(credits ? workspace.credits.available : workspace.credits.used)}</td></tr>)}
    </tbody></table>{workspaces.length === 0 && <div className="internal-empty">No workspaces found.</div>}</div></section>;
}

function CustomerTable({ users, query, setQuery, openCustomer, title, count, viewAll }: { users: User[]; query: string;
  setQuery: (value: string) => void; openCustomer: (id: string) => void; title: string; count: number; viewAll?: () => void }) {
  return <section className="internal-panel internal-customers"><div className="internal-panel-heading"><div><h2>{title}</h2><p>{count} accounts in this view</p></div>
    {viewAll && <button className="internal-view-all" onClick={viewAll}>View all <ArrowRight size={15} /></button>}</div>
    <div className="internal-table-toolbar"><Search size={17} /><input aria-label="Search customers" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email, or user ID" /></div>
    <div className="internal-table-wrap"><table><thead><tr><th>Customer</th><th>Account status</th><th>User ID</th><th aria-label="Open" /></tr></thead><tbody>
      {users.map(user => <tr key={user.id} onClick={() => void openCustomer(user.id)}><td><div className="internal-customer-cell"><span className="internal-avatar small">{(user.name || user.email).slice(0, 1).toUpperCase()}</span>
        <div><strong>{user.name}</strong><small>{user.email}</small></div></div></td><td><span className={`internal-pill ${user.status}`}>{user.status}</span></td>
        <td className="internal-id">{user.id}</td><td><button className="internal-row-open" aria-label={`Open ${user.name}`} onClick={event => { event.stopPropagation(); void openCustomer(user.id); }}><ArrowRight size={17} /></button></td></tr>)}
    </tbody></table>{users.length === 0 && <div className="internal-empty">No customers match this search.</div>}</div></section>;
}
