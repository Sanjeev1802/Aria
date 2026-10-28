"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { InternalCustomerDirectory, filterCustomers } from "./internal-customer-directory";
import { InternalCustomerPreviewTable } from "./internal-customer-preview-table";
import { INTERNAL_AUDIT_SOURCE_AI_ACCESS } from "@/lib/internal-audit-copy";
import { InternalCustomerProfilePanel, type InternalCustomerAction } from "./internal-customer-profile-panel";
import { ariaSignOut } from "@/lib/aria-session";
import { InternalAdminPage } from "./internal-admin-page";
import { InternalAppSidebar } from "./internal-app-sidebar";
import { InternalOperatorActivityList, type OperatorAuditEntry } from "./internal-operator-activity-list";
import { InternalOverviewView } from "./internal-overview-view";
import { InternalPageHeader } from "./internal-page-header";
import { InternalPageIntro } from "./internal-page-intro";
import { InternalPageShell } from "./internal-page-shell";
import { InternalProfilePage } from "./internal-profile-page";
import { InternalSettingsPage } from "./internal-settings-page";
import { internalSettingsSectionHref, parseInternalSettingsSection } from "./internal-settings-sections";
import {
  applyInternalColorScheme,
  readInternalColorScheme,
  type InternalColorScheme,
} from "./internal-theme-toggle";
import { InternalSubscriptionPlansView } from "./internal-subscription-plans-view";
import {
  internalSectionHref,
  internalSectionEyebrow,
  internalSectionLabel,
  parseInternalSection,
  type InternalSection,
} from "./internal-section";
type Credits = { period: string; included: number; used: number; reserved: number; available: number };
type User = {
  id: string; email: string; name: string; status: "active" | "disabled"; aiAccessSuspended?: boolean;
  personalWorkspaceId: string;
};
type Workspace = {
  id: string; name: string; plan: "free" | "pro" | "team"; seatLimit: number; seatsUsed: number;
  ownerId: string; credits: Credits; createdAt?: number;
};
type Audit = OperatorAuditEntry & { credits?: number };
type Overview = {
  users: User[]; workspaces: Workspace[]; summary: {
    users: number; workspaces: number; activeUsers: number; teamWorkspaces: number; creditsUsed: number;
  }; activity: Audit[]; limited: boolean;
  internalRole: "super_admin" | "support" | "billing" | "operations"; operatorId: string;
  operator: { name: string; email: string };
};
type Customer = {
  user: User;
  workspaces: (Workspace & { role: string; members: { id: string; name: string; role: string; status: string }[] })[];
};
type ActionType = "disable_user" | "enable_user" | "revoke_sessions" | "set_plan" | "grant_credits";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "same-origin", cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body as T;
}

function sectionDescription(section: InternalSection) {
  switch (section) {
    case "overview":
      return "Customers, workspaces, and usage at a glance.";
    case "customers":
      return "Find an account and review its access and usage.";
    case "subscription":
      return "Pro and Team plans shown to customers on ARIA pricing — copy, price, credits, and seats.";
    case "activity":
      return "Administrative changes made through Internal — actor, reason, and outcome.";
    case "operations":
      return "Operator guidance and configuration notes.";
    case "admin":
      return "Super admin shortcuts and setup references.";
    case "profile":
      return "Your operator identity and permissions.";
    case "settings":
      return "Console preferences and documentation links.";
  }
}

export function InternalDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = parseInternalSection(searchParams.get("section"));

  const [overview, setOverview] = useState<Overview | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [customerDrawerScope, setCustomerDrawerScope] = useState<"overview" | "full">("full");
  const [query, setQuery] = useState("");
  const [customerStatus, setCustomerStatus] = useState<"all" | User["status"]>("all");
  const [customerPlan, setCustomerPlan] = useState<"all" | Workspace["plan"]>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [colorScheme, setColorScheme] = useState<InternalColorScheme>("dark");
  const [action, setAction] = useState<{ type: ActionType; targetId: string; label: string; plan?: Workspace["plan"] } | null>(null);
  const [reason, setReason] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [accountAccessPending, setAccountAccessPending] = useState(false);
  const [accountAccessError, setAccountAccessError] = useState("");

  useEffect(() => {
    const scheme = readInternalColorScheme();
    setColorScheme(scheme);
    applyInternalColorScheme(scheme);
  }, []);

  const showSection = useCallback((next: InternalSection) => {
    router.push(internalSectionHref(next));
    setActiveUserId(null);
    setCustomer(null);
    setCustomerDrawerScope("full");
  }, [router]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setOverview(await api<Overview>("/api/admin/overview/"));
      setError("");
      setRefreshedAt(Date.now());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load the dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const openCustomer = async (id: string, scope: "overview" | "full" = "full") => {
    setCustomerDrawerScope(scope);
    setActiveUserId(id);
    setCustomer(null);
    setAccountAccessError("");
    try {
      setCustomer(await api<Customer>(`/api/admin/customers/${encodeURIComponent(id)}/`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load customer.");
    }
  };

  const closeCustomer = () => {
    setActiveUserId(null);
    setCustomer(null);
    setCustomerDrawerScope("full");
  };

  const submitAction = async () => {
    if (!action || reason.trim().length < 8 || submitting || (action.type === "grant_credits" &&
      (!Number.isSafeInteger(Number(creditAmount) * 1000) || Number(creditAmount) <= 0 || Number(creditAmount) > 100))) return;
    setSubmitting(true);
    setActionError("");
    try {
      await api("/api/admin/actions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          type: action.type,
          targetId: action.targetId,
          reason: reason.trim(),
          ...(action.plan ? { plan: action.plan } : {}),
          ...(action.type === "grant_credits" ? { credits: Number(creditAmount) } : {}),
        }),
      });
      setAction(null);
      setReason("");
      setCreditAmount("");
      setActionError("");
      await refresh();
      if (activeUserId) await openCustomer(activeUserId, customerDrawerScope);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Action failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = useMemo(
    () => filterCustomers(
      overview?.users ?? [],
      overview?.workspaces ?? [],
      query,
      customerStatus,
      customerPlan,
    ),
    [overview, query, customerStatus, customerPlan],
  );

  const planCounts = useMemo(() => ({
    free: overview?.workspaces.filter(w => w.plan === "free").length ?? 0,
    pro: overview?.workspaces.filter(w => w.plan === "pro").length ?? 0,
    team: overview?.workspaces.filter(w => w.plan === "team").length ?? 0,
  }), [overview]);

  const myActivity = useMemo(() => {
    if (!overview) return [];
    return overview.activity.filter(entry => entry.actorId === overview.operatorId);
  }, [overview]);

  const isSuperAdmin = overview?.internalRole === "super_admin";

  const settingsInitialSection = useMemo(
    () => parseInternalSettingsSection(searchParams.get("settingsSection"), isSuperAdmin),
    [searchParams, isSuperAdmin],
  );

  const applyAccountAccess = useCallback(async (active: boolean, targetId: string) => {
    setAccountAccessPending(true);
    setAccountAccessError("");
    try {
      await api("/api/admin/actions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          type: active ? "enable_user" : "disable_user",
          targetId,
          source: INTERNAL_AUDIT_SOURCE_AI_ACCESS,
        }),
      });
      await refresh();
      if (activeUserId) await openCustomer(activeUserId, customerDrawerScope);
    } catch (cause) {
      setAccountAccessError(cause instanceof Error ? cause.message : "Could not update account access.");
    } finally {
      setAccountAccessPending(false);
    }
  }, [activeUserId, customerDrawerScope, refresh]);

  const requestAdminAction = useCallback((next: InternalCustomerAction) => {
    setActionError("");
    if (next.type === "enable_user" || next.type === "disable_user") {
      void applyAccountAccess(next.type === "enable_user", next.targetId);
      return;
    }
    setAction(next);
    setCreditAmount("");
  }, [applyAccountAccess]);

  const openCustomers = useCallback(() => {
    router.push(internalSectionHref("customers"));
  }, [router]);

  const openPlatformSettings = useCallback(() => {
    router.push(internalSettingsSectionHref("general"));
  }, [router]);
  const refreshLabel = refreshedAt
    ? `Last refresh ${new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(refreshedAt)}`
    : undefined;

  const onThemeChange = (scheme: InternalColorScheme) => {
    setColorScheme(scheme);
    applyInternalColorScheme(scheme);
  };

  const handleSignOut = async () => {
    await ariaSignOut();
    window.location.assign("/internal/sign-in/");
  };

  return (
    <SidebarProvider
      className="internal-shell internal-dashboard"
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as CSSProperties}
    >
      <InternalAppSidebar
        section={section}
        onSectionChange={showSection}
        operator={overview ? { ...overview.operator, role: overview.internalRole } : undefined}
        onSignOut={handleSignOut}
      />
      <SidebarInset className="internal-content flex min-h-svh flex-col">
        <InternalPageHeader
          section={section}
          role={overview?.internalRole}
          refreshing={refreshing}
          refreshedAt={refreshedAt}
          onRefresh={() => void refresh()}
        />
        <main className="internal-main flex-1">
          {loading ? <div className="internal-state">Loading ARIA operations…</div>
            : error && !overview ? (
              <div className="internal-state internal-error">
                <LockKeyhole size={26} aria-hidden />
                <h1>Internal access unavailable</h1>
                <p>{error}</p>
                <a href="/internal/sign-in/">Operator sign in</a>
              </div>
            ) : overview ? (
              <InternalPageShell key={section}>
                {section !== "profile" && section !== "settings" ? (
                  <InternalPageIntro
                    eyebrow={internalSectionEyebrow(section)}
                    title={internalSectionLabel(section)}
                    description={
                      section === "overview"
                        ? `${sectionDescription(section)} Counts and credits reflect the current API snapshot; bounded lists are labeled when totals are capped.`
                        : section === "activity"
                          ? `${sectionDescription(section)} ${overview.activity.length} records in the current API window (not full history).`
                          : sectionDescription(section)
                    }
                  />
                ) : null}
                {error ? (
                  <div className="internal-alert" role="alert">
                    {error}
                    <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
                      <X size={16} aria-hidden />
                    </button>
                  </div>
                ) : null}
                {overview.limited ? (
                  <div className="internal-alert">
                    Showing the first 500 customers or workspaces. Narrow the scope before using totals for reporting.
                  </div>
                ) : null}

                {section === "overview" && (
                  <InternalOverviewView
                    summary={overview.summary}
                    planCounts={planCounts}
                    workspaces={overview.workspaces.map(w => ({ plan: w.plan, createdAt: w.createdAt }))}
                    customersPreview={(
                      <InternalCustomerPreviewTable
                        users={filteredUsers.slice(0, 8)}
                        query={query}
                        setQuery={setQuery}
                        status={customerStatus}
                        setStatus={setCustomerStatus}
                        openCustomer={id => void openCustomer(id, "overview")}
                        title="Customers"
                        totalLoaded={overview.users.length}
                        viewAll={() => showSection("customers")}
                      />
                    )}
                  />
                )}

                {section === "customers" && (
                  <InternalCustomerDirectory
                    users={filteredUsers}
                    allUsers={overview.users}
                    workspaces={overview.workspaces}
                    query={query}
                    setQuery={setQuery}
                    status={customerStatus}
                    setStatus={setCustomerStatus}
                    plan={customerPlan}
                    setPlan={setCustomerPlan}
                    openCustomer={openCustomer}
                    totalLoaded={overview.users.length}
                  />
                )}

                {section === "subscription" && (
                  <InternalSubscriptionPlansView isSuperAdmin={overview.internalRole === "super_admin"} />
                )}

                {section === "activity" && (
                  <section className="internal-panel overflow-hidden">
                    <InternalOperatorActivityList activity={overview.activity} />
                  </section>
                )}

                {section === "operations" && (
                  <div className="internal-operations internal-page-grid lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Operator access</CardTitle>
                        <CardDescription>Admin access is checked on every request against verified identity subjects.</CardDescription>
                      </CardHeader>
                      <CardContent><Badge variant="outline">Server enforced</Badge></CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Credit recovery</CardTitle>
                        <CardDescription>Pending reservations are reconciled by the scheduled job.</CardDescription>
                      </CardHeader>
                      <CardContent><code className="internal-ops-code">npm run admin -- reconcile</code></CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle>Production setup</CardTitle>
                        <CardDescription>See INTERNAL_ADMIN_SETUP.md for allowlists, backfill, and staging checks.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        Service health indicators are not shown until real telemetry is wired (PRD §6 OPERATIONS).
                      </CardContent>
                    </Card>
                  </div>
                )}

                {section === "admin" && isSuperAdmin && (
                  <InternalAdminPage onNavigate={showSection} />
                )}

                {section === "profile" && (
                  <InternalProfilePage
                    name={overview.operator.name}
                    email={overview.operator.email}
                    operatorId={overview.operatorId}
                    role={overview.internalRole}
                    myActivity={myActivity}
                    onViewAllActivity={() => showSection("activity")}
                    onOpenPlatformSettings={isSuperAdmin ? openPlatformSettings : undefined}
                    onSignOut={handleSignOut}
                  />
                )}

                {section === "settings" && (
                  <InternalSettingsPage
                    operatorName={overview.operator.name}
                    operatorEmail={overview.operator.email}
                    operatorRole={overview.internalRole}
                    colorScheme={colorScheme}
                    onColorSchemeChange={onThemeChange}
                    onOpenProfile={() => showSection("profile")}
                    onOpenAdmin={isSuperAdmin ? () => showSection("admin") : undefined}
                    isSuperAdmin={Boolean(isSuperAdmin)}
                    initialSection={settingsInitialSection}
                    onViewAllActivity={() => showSection("activity")}
                    onNavigatePlatform={showSection}
                  />
                )}
              </InternalPageShell>
            ) : null}
        </main>
      </SidebarInset>

      {activeUserId ? (
        <div className="internal-drawer-backdrop" onClick={closeCustomer}>
          <aside
            className={`internal-drawer internal-drawer--profile${customerDrawerScope === "overview" ? " internal-drawer--profile-overview" : ""}`}
            onClick={event => event.stopPropagation()}
            aria-label="Customer details"
          >
            {!customer || !overview ? (
              <div className="internal-state">Loading customer…</div>
            ) : (
              <InternalCustomerProfilePanel
                scope={customerDrawerScope}
                customer={customer}
                internalRole={overview.internalRole}
                onClose={closeCustomer}
                onRequestAction={requestAdminAction}
                accountAccessPending={accountAccessPending}
                accountAccessError={accountAccessError}
              />
            )}
          </aside>
        </div>
      ) : null}

      <DialogPrimitive.Root open={Boolean(action)} onOpenChange={open => { if (!open && !submitting) { setAction(null); setReason(""); setCreditAmount(""); setActionError(""); } }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="internal-confirm-overlay" />
          {action ? (
            <DialogPrimitive.Content className="internal-confirm">
              <div className="internal-confirm-icon"><LockKeyhole size={22} aria-hidden /></div>
              <DialogPrimitive.Title>Confirm account action</DialogPrimitive.Title>
              <DialogPrimitive.Description>{action.label}</DialogPrimitive.Description>
              {actionError ? <p className="internal-action-error" role="alert">{actionError}</p> : null}
              {action.type === "grant_credits" && (
                <>
                  <label htmlFor="internal-credit-amount">Credits to grant (up to 100)</label>
                  <input id="internal-credit-amount" type="number" min="0.001" max="100" step="0.001" value={creditAmount}
                    onChange={event => setCreditAmount(event.target.value)} placeholder="10" />
                </>
              )}
              <label htmlFor="internal-action-reason">Reason for this change</label>
              <textarea id="internal-action-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={500}
                placeholder="Describe the customer request or incident (at least 8 characters)" />
              <div className="internal-confirm-buttons">
                <button type="button" onClick={() => { setAction(null); setReason(""); setCreditAmount(""); setActionError(""); }} disabled={submitting}>Cancel</button>
                <button type="button" onClick={() => void submitAction()} disabled={submitting || reason.trim().length < 8 || (action.type === "grant_credits" &&
                  (!Number.isSafeInteger(Number(creditAmount) * 1000) || Number(creditAmount) <= 0 || Number(creditAmount) > 100))}>
                  {submitting ? "Applying…" : "Confirm action"}
                </button>
              </div>
            </DialogPrimitive.Content>
          ) : null}
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </SidebarProvider>
  );
}
