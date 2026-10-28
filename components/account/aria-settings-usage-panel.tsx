"use client";

import {
  loadAriaSidebarCredits,
  refreshAriaUsage,
  type AriaSidebarCreditsSnapshot,
} from "@/lib/aria-sidebar-credits-storage";
import { ARIA_IS_PREVIEW, useAriaSession } from "@/lib/aria-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 8;

const PREVIEW_ACTIVITY: Record<string, number> = {
  "2026-10-22": 12400,
  "2026-10-21": 8200,
  "2026-10-20": 0,
  "2026-10-19": 15600,
  "2026-10-18": 4300,
  "2026-10-17": 9800,
  "2026-10-15": 2100,
  "2026-10-12": 6400,
};

type ActivityRow = { date: string; tokens: number };

type ShowFilter = "period" | "all";

function formatCredits(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function formatTokens(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatRowDate(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function activityRows(activity: Record<string, number>): ActivityRow[] {
  return Object.entries(activity)
    .map(([date, tokens]) => ({ date, tokens }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function previewSnapshot(): AriaSidebarCreditsSnapshot {
  return {
    used: 42.5,
    included: 6000,
    available: 5957.5,
    reserved: 0,
    planLabel: "Pro",
    period: "2026-10",
    activity: PREVIEW_ACTIVITY,
  };
}

export function SettingsModalUsagePanel() {
  const apiAccess = useAriaSession().entitlements?.apiAccess ?? false;
  const [snapshot, setSnapshot] = useState<AriaSidebarCreditsSnapshot>(() =>
    ARIA_IS_PREVIEW ? previewSnapshot() : loadAriaSidebarCredits(),
  );
  const [loading, setLoading] = useState(!ARIA_IS_PREVIEW);
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<ShowFilter>("period");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (ARIA_IS_PREVIEW) return;
    let disposed = false;
    const load = async () => {
      setLoading(true);
      try {
        const next = await refreshAriaUsage();
        if (!disposed) setSnapshot(next);
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    void load();
    const onUsage = () => {
      setSnapshot(loadAriaSidebarCredits());
    };
    window.addEventListener("aria:credits-updated", onUsage);
    window.addEventListener("aria:token-activity-updated", onUsage);
    return () => {
      disposed = true;
      window.removeEventListener("aria:credits-updated", onUsage);
      window.removeEventListener("aria:token-activity-updated", onUsage);
    };
  }, []);

  const activity = snapshot.activity ?? {};
  const period = snapshot.period ?? new Date().toISOString().slice(0, 7);
  const totalTokens = useMemo(
    () => Object.values(activity).reduce((sum, n) => sum + n, 0),
    [activity],
  );
  const periodTokens = useMemo(
    () =>
      Object.entries(activity).reduce(
        (sum, [date, tokens]) => (date.startsWith(period) ? sum + tokens : sum),
        0,
      ),
    [activity, period],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activityRows(activity).filter(row => {
      if (show === "period" && !row.date.startsWith(period)) return false;
      if (!q) return true;
      return row.date.includes(q) || formatRowDate(row.date).toLowerCase().includes(q);
    });
  }, [activity, period, query, show]);

  useEffect(() => {
    setPage(1);
  }, [query, show]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const { used, included, available, reserved = 0, planLabel } = snapshot;
  const remaining = available ?? Math.max(0, included - used);
  const pct = included > 0 ? Math.min(100, (used / included) * 100) : 0;

  return (
    <div className="aria-usage-dashboard">
      <div className="aria-usage-dashboard__stats" aria-label="Usage summary">
        <article className="aria-usage-stat">
          <p className="aria-usage-stat__label">Tokens this month</p>
          <p className="aria-usage-stat__value tabular-nums">{formatTokens(periodTokens)}</p>
          <p className="aria-usage-stat__meta">{formatTokens(totalTokens)} all time</p>
        </article>
        <article className="aria-usage-stat">
          <p className="aria-usage-stat__label">Credits used</p>
          <p className="aria-usage-stat__value tabular-nums">{formatCredits(used)}</p>
          <p className="aria-usage-stat__meta">of {formatCredits(included)} included</p>
        </article>
        <article className="aria-usage-stat">
          <p className="aria-usage-stat__label">Credits left</p>
          <p className="aria-usage-stat__value tabular-nums">{formatCredits(remaining)}</p>
          <p className="aria-usage-stat__meta">{planLabel}</p>
        </article>
        <article className="aria-usage-stat">
          <p className="aria-usage-stat__label">Reserved</p>
          <p className="aria-usage-stat__value tabular-nums">{formatCredits(reserved)}</p>
          <p className="aria-usage-stat__meta">In-flight requests</p>
        </article>
      </div>

      <div
        className="aria-usage-dashboard__meter"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={included}
        aria-label={`${formatCredits(used)} of ${formatCredits(included)} credits used this period`}
      >
        <span className="aria-usage-dashboard__meter-bar" style={{ width: `${pct}%` }} />
      </div>

      <section className="aria-usage-dashboard__sheet" aria-labelledby="aria-usage-activity-heading">
        <div className="aria-usage-dashboard__toolbar">
          <div className="aria-usage-dashboard__toolbar-start">
            <h2 id="aria-usage-activity-heading" className="aria-usage-dashboard__sheet-title">
              Token activity
            </h2>
            <p className="aria-usage-dashboard__sheet-sub">
              Daily model tokens for your account · billing period {period}
            </p>
          </div>
          <div className="aria-usage-dashboard__toolbar-actions">
            <div className="aria-usage-dashboard__search">
              <Search className="aria-usage-dashboard__search-icon" aria-hidden />
              <Input
                type="search"
                placeholder="Search by date…"
                value={query}
                onChange={event => setQuery(event.target.value)}
                className="aria-usage-dashboard__search-input h-9"
                aria-label="Search activity by date"
              />
            </div>
            <label className="aria-usage-dashboard__select-wrap relative">
              <span className="sr-only">Show</span>
              <Filter className="pointer-events-none absolute top-1/2 left-2.5 z-[1] size-3.5 -translate-y-1/2 opacity-50" aria-hidden />
              <select
                className="aria-usage-dashboard__select"
                value={show}
                onChange={event => setShow(event.target.value as ShowFilter)}
              >
                <option value="period">This billing period</option>
                <option value="all">All recorded days</option>
              </select>
            </label>
          </div>
        </div>

        <div className="aria-usage-dashboard__table-wrap">
          <table className="aria-usage-dashboard__table">
            <thead>
              <tr>
                <th scope="col" className="col-date">
                  Date
                </th>
                <th scope="col" className="col-numeric">
                  Tokens
                </th>
                <th scope="col" className="col-numeric">
                  Credits (period)
                </th>
                <th scope="col" className="col-status">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="aria-usage-dashboard__empty">
                    Loading usage…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="aria-usage-dashboard__empty">
                    No token activity for this filter yet. Send a message in chat to start tracking.
                  </td>
                </tr>
              ) : (
                pageRows.map(row => {
                  const active = row.tokens > 0;
                  return (
                    <tr key={row.date}>
                      <td>
                        <span className="aria-usage-dashboard__date">{formatRowDate(row.date)}</span>
                        <span className="aria-usage-dashboard__date-iso">{row.date}</span>
                      </td>
                      <td className="col-numeric tabular-nums font-medium">{formatTokens(row.tokens)}</td>
                      <td className="col-numeric tabular-nums text-muted-foreground">—</td>
                      <td className="col-status">
                        <span
                          className={cn(
                            "aria-usage-dashboard__badge",
                            active
                              ? "aria-usage-dashboard__badge--active"
                              : "aria-usage-dashboard__badge--idle",
                          )}
                        >
                          {active ? "Active" : "Idle"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="aria-usage-dashboard__footer">
          <p className="aria-usage-dashboard__footer-meta">
            {filtered.length} {filtered.length === 1 ? "day" : "days"}
            {show === "period" ? ` in ${period}` : ""}
          </p>
          <nav className="aria-usage-dashboard__pagination" aria-label="Activity pages">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={safePage <= 1 || loading}
              aria-label="Previous page"
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="aria-usage-dashboard__page-label tabular-nums">
              {safePage} / {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={safePage >= pageCount || loading}
              aria-label="Next page"
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </nav>
        </footer>
      </section>

      <section className="aria-usage-dashboard__sheet" aria-labelledby="aria-usage-api-heading">
        <div className="aria-usage-dashboard__toolbar">
          <div className="aria-usage-dashboard__toolbar-start">
            <h2 id="aria-usage-api-heading" className="aria-usage-dashboard__sheet-title">
              API access
            </h2>
            <p className="aria-usage-dashboard__sheet-sub">
              Programmatic keys for your workspace (managed separately from chat tokens).
            </p>
          </div>
        </div>
        <div className="aria-usage-dashboard__table-wrap">
          <table className="aria-usage-dashboard__table">
            <thead>
              <tr>
                <th scope="col" className="col-date">
                  Access
                </th>
                <th scope="col" className="col-plan">
                  Plan
                </th>
                <th scope="col" className="col-status">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="col-date font-medium">REST / API keys</td>
                <td className="col-plan">{planLabel}</td>
                <td className="col-status">
                  <span
                    className={cn(
                      "aria-usage-dashboard__badge",
                      apiAccess
                        ? "aria-usage-dashboard__badge--active"
                        : "aria-usage-dashboard__badge--idle",
                    )}
                  >
                    {apiAccess ? "Included" : "Upgrade required"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {!apiAccess ? (
          <p className="aria-usage-dashboard__hint">
            Pro and Team plans include API access. Upgrade from Billing or{" "}
            <a href="/pricing/" className="aria-usage-dashboard__link">
              view plans
            </a>
            .
          </p>
        ) : (
          <p className="aria-usage-dashboard__hint">
            API key management is coming soon. Credits used via the API share the same workspace pool shown above.
          </p>
        )}
      </section>
    </div>
  );
}
