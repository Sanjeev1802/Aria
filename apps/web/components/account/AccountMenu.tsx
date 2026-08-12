"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@aria/auth";
import { ConfirmDialog } from "@/components/chat/ConfirmDialog";
import { getPlan, loadPlanId, type PlanId } from "@/lib/aria/plans";
import {
  ensureWorkspaceUser,
  isAdminEmail,
} from "@/lib/aria/users";
import {
  BarChart3Icon,
  ChevronUpIcon,
  CreditCardIcon,
  LogOutIcon,
  SparklesIcon,
  UsersIcon,
  UserIcon,
} from "lucide-react";

type AccountMenuProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

export function AccountMenu({ collapsed, onNavigate }: AccountMenuProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [planId, setPlanId] = useState<PlanId>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const initial = (user?.email?.[0] ?? "A").toUpperCase();
  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "Account";
  const plan = getPlan(planId);

  useEffect(() => {
    setPlanId(loadPlanId());
    if (user?.email) {
      ensureWorkspaceUser(user.email, user.displayName);
      setIsAdmin(isAdminEmail(user.email));
    } else {
      setIsAdmin(false);
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function go(href: string) {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  }

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await signOut();
      router.replace("/");
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-[min(100%,16.5rem)] overflow-hidden rounded-2xl border border-foreground/10 bg-background shadow-xl">
          <div className="border-b border-foreground/10 px-3 py-3">
            <p className="truncate text-[12px] font-medium text-foreground">
              {user?.email ?? "Signed in"}
            </p>
            <p className="mt-0.5 text-[11px] text-foreground/45">
              {plan.name} plan
              {isAdmin ? " · Admin" : " · User"}
            </p>
          </div>

          {planId === "free" ? (
            <Link
              href="/dashboard/plans"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="flex items-center gap-2.5 border-b border-foreground/10 bg-accent/15 px-3 py-2.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent/25"
            >
              <SparklesIcon className="size-3.5 text-accent" />
              Upgrade plan
            </Link>
          ) : null}

          <div className="p-1">
            <button
              type="button"
              onClick={() => go("/dashboard/profile")}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12px] text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <UserIcon className="size-3.5" strokeWidth={1.75} />
              Profile
            </button>
            <button
              type="button"
              onClick={() => go("/dashboard/plans")}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12px] text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <CreditCardIcon className="size-3.5" strokeWidth={1.75} />
              My plan
            </button>
            <button
              type="button"
              onClick={() => go("/dashboard/usage")}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12px] text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <BarChart3Icon className="size-3.5" strokeWidth={1.75} />
              Usage
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => go("/dashboard/users")}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12px] text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <UsersIcon className="size-3.5" strokeWidth={1.75} />
                Users
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setLogoutOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12px] text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <LogOutIcon className="size-3.5" strokeWidth={1.75} />
              Log out
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 text-left transition-colors hover:bg-foreground/5"
          aria-expanded={open}
          aria-haspopup="menu"
          title="Account"
        >
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-medium text-background">
            {initial}
          </div>
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
                {displayName}
              </span>
              <ChevronUpIcon
                className={`size-3.5 shrink-0 text-foreground/40 transition-transform ${open ? "" : "rotate-180"}`}
              />
            </>
          ) : null}
        </button>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title="Sign out of ARIA?"
        description="You’ll need to sign in again to continue chatting in your workspace."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        destructive
        busy={loggingOut}
        onCancel={() => {
          if (!loggingOut) setLogoutOpen(false);
        }}
        onConfirm={() => void confirmLogout()}
      />
    </div>
  );
}
