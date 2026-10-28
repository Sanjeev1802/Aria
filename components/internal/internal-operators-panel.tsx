"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Role = "support" | "billing" | "operations";
type Operator = { email: string; role: Role; grantedBy: string; at: number };

const ROLES: { id: Role; label: string; hint: string }[] = [
  { id: "support", label: "Support", hint: "View only" },
  { id: "billing", label: "Billing", hint: "Change plans and grant credits" },
  { id: "operations", label: "Operations", hint: "Suspend AI access and revoke sessions" },
];

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

/** Super admins decide who else can open the console and what they may change. */
export function InternalOperatorsPanel() {
  const [operators, setOperators] = useState<Operator[] | null>(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("support");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => call<{ operators: Operator[] }>("GET")
    .then(data => { setOperators(data.operators); setError(""); })
    .catch((cause: Error) => setError(cause.message)), []);

  useEffect(() => { void load(); }, [load]);

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try { await task(); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the change."); }
    finally { setBusy(false); }
  };

  const grant = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => { await call("PUT", { email, role }); setEmail(""); });
  };

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">Operators</CardTitle>
        <CardDescription>
          Only super admins can change everything. Give a teammate a role and they can open this console when they
          sign in with that verified email. Changes apply on their next request.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={grant} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium">
            Email
            <Input type="email" required value={email} onChange={event => setEmail(event.target.value)}
              placeholder="teammate@company.com" autoComplete="off" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Role
            <select value={role} onChange={event => setRole(event.target.value as Role)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {ROLES.map(item => <option key={item.id} value={item.id}>{item.label} — {item.hint}</option>)}
            </select>
          </label>
          <Button type="submit" disabled={busy || !email.trim()}>
            <UserPlus aria-hidden /> Grant access
          </Button>
        </form>

        {error ? <p className="internal-action-error" role="alert">{error}</p> : null}

        {operators === null && !error ? (
          <Skeleton className="h-16 w-full" />
        ) : operators && operators.length === 0 ? (
          <p className="text-sm text-muted-foreground">No delegated operators yet.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border">
            {operators?.map(operator => (
              <li key={operator.email} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{operator.email}</span>
                  <span className="block text-xs text-muted-foreground">
                    Added {new Date(operator.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <select value={operator.role} disabled={busy} aria-label={`Role for ${operator.email}`}
                    onChange={event => void run(() => call("PUT", { email: operator.email, role: event.target.value }))}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-sm">
                    {ROLES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                  <Badge variant="secondary" className="hidden font-normal sm:inline-flex">
                    {ROLES.find(item => item.id === operator.role)?.hint}
                  </Badge>
                  <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label={`Remove ${operator.email}`}
                    onClick={() => void run(() => call("DELETE", { email: operator.email }))}>
                    <Trash2 aria-hidden />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
