"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Check, Crown, Lock, Minus, ShieldCheck, Trash2, UserCog, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { InternalKpiCard } from "./internal-kpi-card";
import {
  GRANTABLE_TEAM_ROLES,
  PRD_INTERNAL_ROLE_MATRIX,
  internalRoleLabel,
  internalRoleSummary,
  teamRoleOf,
  type InternalRole,
  type TeamRole,
} from "./internal-operator-role";
import { SegmentedControl } from "./segmented-control";

type GrantRole = Exclude<TeamRole, "super_admin">;
type Member = { email: string; role: InternalRole; canEdit: boolean; grantedBy: string; at: number };
type SuperAdmin = { email: string; name: string };
type TeamResponse = { operators: Member[]; superAdmins: SuperAdmin[] };

const ROLE_OPTIONS = GRANTABLE_TEAM_ROLES.map(role => ({ value: role, label: internalRoleLabel(role) }));
const initials = (text: string) => (text.trim()[0] ?? "?").toUpperCase();
const date = (at: number) => new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

async function call<T>(method: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/admin/operators/", {
    method, credentials: "same-origin", cache: "no-store",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data as T;
}

/** The ARIA Team: who can open the console and what each person may change. Super admins only. */
export function InternalTeamPage() {
  const [team, setTeam] = useState<TeamResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<GrantRole>("member");
  const [canEdit, setCanEdit] = useState(false);

  const load = useCallback(() => call<TeamResponse>("GET")
    .then(data => { setTeam(data); setError(""); })
    .catch((cause: Error) => setError(cause.message)), []);
  useEffect(() => { void load(); }, [load]);

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try { await task(); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the change."); }
    finally { setBusy(false); }
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => { await call("PUT", { email, role, canEdit: role === "admin" && canEdit }); setEmail(""); setCanEdit(false); });
  };

  const counts = useMemo(() => {
    const members = team?.operators ?? [];
    const of = (r: TeamRole) => members.filter(member => teamRoleOf(member.role) === r);
    return {
      superAdmins: team?.superAdmins.length ?? 0,
      admins: of("admin").length,
      adminsWithEdit: of("admin").filter(member => member.canEdit).length,
      members: of("member").length,
      scoped: of("billing").length + of("operations").length,
    };
  }, [team]);

  return (
    <div className="internal-team internal-page-stack">
      <section className="internal-section" aria-labelledby="internal-team-overview">
        <h2 id="internal-team-overview" className="sr-only">Team overview</h2>
        <div className="internal-kpi-grid">
          {team ? (
            <>
              <InternalKpiCard index={0} label="Super admins" value={counts.superAdmins} icon={Crown} tone="violet"
                footerTitle="Set on the server" footerDetail="Full control" />
              <InternalKpiCard index={1} label="Admins" value={counts.admins} icon={ShieldCheck} tone="blue"
                footerTitle={`${counts.adminsWithEdit} can edit`} footerDetail="Edit access is granted" />
              <InternalKpiCard index={2} label="Members" value={counts.members} icon={Users} tone="teal"
                footerTitle="View only" footerDetail="Cannot change anything" />
              <InternalKpiCard index={3} label="Scoped roles" value={counts.scoped} icon={UserCog} tone="orange"
                footerTitle="Billing, Operations" footerDetail="Fixed job rights" />
            </>
          ) : error ? null : [0, 1, 2, 3].map(i => <Skeleton key={i} className="internal-kpi-skeleton" />)}
        </div>
      </section>

      {error ? <div className="internal-alert" role="alert">{error}</div> : null}

      <div className="internal-team__layout">
        <div className="internal-team__main">
          <Card className="internal-team-card">
            <CardHeader>
              <CardTitle>Add to the ARIA Team</CardTitle>
              <CardDescription>They sign in with this verified email and get the role you choose. You can change it any time.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={add} className="internal-team-form">
                <label className="internal-field">
                  <span className="internal-field__label">Email</span>
                  <Input type="email" required value={email} onChange={event => setEmail(event.target.value)}
                    placeholder="teammate@thebinaryholdings.com" autoComplete="off" />
                </label>
                <div className="internal-field">
                  <span className="internal-field__label">Role</span>
                  <SegmentedControl label="Role" value={role} options={ROLE_OPTIONS} onChange={setRole} />
                  <small>{internalRoleSummary(role)}</small>
                </div>
                {role === "admin" ? (
                  <div className="internal-switch-row">
                    <label htmlFor="team-new-edit">
                      <span>Can change anything</span>
                      <small>Plans, credits, AI access, sessions and subscription pricing. Off keeps this admin view-only.</small>
                    </label>
                    <Switch id="team-new-edit" checked={canEdit} onCheckedChange={setCanEdit} />
                  </div>
                ) : null}
                <div className="internal-team-form__actions">
                  <Button type="submit" disabled={busy || !email.trim()}><UserPlus aria-hidden /> Add to team</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="internal-team-card">
            <CardHeader>
              <CardTitle>People</CardTitle>
              <CardDescription>Everyone who can open the internal console.</CardDescription>
            </CardHeader>
            <CardContent>
              {!team ? <Skeleton className="h-[140px] w-full" /> : (
                <ul className="internal-team-list">
                  {team.superAdmins.map(person => (
                    <li key={person.email} className="internal-team-row">
                      <span className="internal-user-chip" aria-hidden="true">{initials(person.name || person.email)}</span>
                      <span className="internal-team-row__who">
                        <span className="internal-team-row__email">{person.name || person.email}</span>
                        <span className="internal-team-row__meta">{person.name ? `${person.email} · ` : ""}Set on the server</span>
                      </span>
                      <span className="internal-team-row__controls">
                        <span className="internal-role-pill internal-role-pill--super_admin"><Lock size={12} aria-hidden /> Super admin</span>
                      </span>
                    </li>
                  ))}
                  {team.operators.map((member, at) => {
                    const teamRole = teamRoleOf(member.role);
                    return (
                      <li key={member.email} className="internal-team-row" style={{ "--i": at } as CSSProperties}>
                        <span className="internal-user-chip" aria-hidden="true">{initials(member.email)}</span>
                        <span className="internal-team-row__who">
                          <span className="internal-team-row__email">{member.email}</span>
                          <span className="internal-team-row__meta">Added {date(member.at)}</span>
                        </span>
                        <span className="internal-team-row__controls">
                          {teamRole === "admin" ? (
                            <span className="internal-team-row__edit">
                              <label htmlFor={`edit-${member.email}`}>Can change anything</label>
                              <Switch id={`edit-${member.email}`} checked={member.canEdit} disabled={busy}
                                onCheckedChange={value => void run(() => call("PUT", { email: member.email, role: "admin", canEdit: value }))} />
                            </span>
                          ) : null}
                          <select value={teamRole} disabled={busy} aria-label={`Role for ${member.email}`}
                            onChange={event => void run(() => call("PUT", { email: member.email, role: event.target.value, canEdit: false }))}
                            className="internal-team-row__select">
                            {GRANTABLE_TEAM_ROLES.map(option => <option key={option} value={option}>{internalRoleLabel(option)}</option>)}
                          </select>
                          <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label={`Remove ${member.email}`}
                            onClick={() => void run(() => call("DELETE", { email: member.email }))}>
                            <Trash2 aria-hidden />
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                  {team.operators.length === 0 ? (
                    <li className="internal-team-empty">No one else is on the ARIA Team yet. Add an admin or a member above.</li>
                  ) : null}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="internal-team__aside" aria-label="What each role can do">
          <Card className="internal-team-card">
            <CardHeader>
              <CardTitle>What each role can do</CardTitle>
              <CardDescription>Server permissions apply on every request.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="internal-role-guide">
                {(["super_admin", "admin", "member", "billing", "operations"] as TeamRole[]).map(teamRole => (
                  <li key={teamRole} className="internal-role-guide__item">
                    <span className={`internal-role-pill internal-role-pill--${teamRole}`}>{internalRoleLabel(teamRole)}</span>
                    <p>{internalRoleSummary(teamRole)}</p>
                    <ul className="internal-role-guide__caps">
                      {PRD_INTERNAL_ROLE_MATRIX.map(row => {
                        const cell = row.roles[teamRole];
                        return (
                          <li key={row.label} data-on={cell === true} data-granted={cell === "granted"}>
                            {cell === false ? <Minus size={13} aria-hidden /> : <Check size={13} aria-hidden />}
                            <span>{row.label}{cell === "granted" ? " (when granted)" : ""}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
