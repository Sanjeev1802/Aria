"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AriaMark } from "@/components/aria-mark";

type Props = {
  title: string;
  lead: string;
  switchLabel: ReactNode;
  children: ReactNode;
};

export function AuthPageShell({ title, lead, switchLabel, children }: Props) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setOpen(true);
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="auth-page">
      <Link className="auth-page-back" href="/">
        ← Back to ARIA
      </Link>
      <div className={`auth-panel t-modal t-stagger ${open ? "is-open" : ""} ${ready ? "is-shown" : ""}`}>
        <Link className="auth-panel-brand t-stagger-line" href="/" aria-label="ARIA home">
          <AriaMark />
          <span>ARIA</span>
        </Link>
        <h1 className="t-stagger-line t-stagger-line--2">{title}</h1>
        <p className="auth-panel-lead t-stagger-line t-stagger-line--3">{lead}</p>
        <div className="t-stagger-line t-stagger-line--4">{children}</div>
        <p className="auth-switch t-stagger-line t-stagger-line--5">{switchLabel}</p>
        <p className="auth-preview-note">Preview only — no account is created or stored on a server.</p>
      </div>
    </div>
  );
}
