"use client";

import { Button } from "@/components/ui/button";
import { ariaSelectWorkspace, useAriaSession } from "@/lib/aria-session";
import { useState } from "react";

export function AriaWorkspaceSwitcher() {
  const session = useAriaSession();
  const [busy, setBusy] = useState<string | null>(null);
  const workspaces = session.workspaces ?? [];
  if (session.status !== "authenticated" || workspaces.length < 2) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Workspaces</p>
      <ul className="space-y-1">
        {workspaces.map(ws => {
          const active = session.workspace?.id === ws.id;
          return (
            <li key={ws.id}>
              <Button
                type="button"
                variant={active ? "secondary" : "ghost"}
                className="h-auto w-full justify-start py-2 text-left"
                disabled={active || busy === ws.id}
                onClick={() => {
                  setBusy(ws.id);
                  void ariaSelectWorkspace(ws.id).finally(() => setBusy(null));
                }}
              >
                <span className="block truncate font-medium">{ws.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{ws.planLabel} · {ws.role}</span>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
