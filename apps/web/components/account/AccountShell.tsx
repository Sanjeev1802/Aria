"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@aria/auth";
import { ConfirmDialog } from "@/components/chat/ConfirmDialog";
import { AriaLogo } from "@/components/chat/AriaLogo";
import {
  ArrowLeftIcon,
  BarChart3Icon,
  CreditCardIcon,
  LogOutIcon,
  SparklesIcon,
  UsersIcon,
  UserIcon,
} from "lucide-react";
import { getPlan, loadPlanId, type PlanId } from "@/lib/aria/plans";
import {
  ensureWorkspaceUser,
  isAdminEmail,
} from "@/lib/aria/users";

const baseNav = [
  { href: "/dashboard/profile", label: "Profile", icon: UserIcon },
  { href: "/dashboard/plans", label: "Plans", icon: CreditCardIcon },
  { href: "/dashboard/usage", label: "Usage", icon: BarChart3Icon },
] as const;

export function AccountShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [planId, setPlanId] = useState<PlanId>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setPlanId(loadPlanId());
    if (user?.email) {
      ensureWorkspaceUser(user.email, user.displayName);
      setIsAdmin(isAdminEmail(user.email));
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const plan = getPlan(planId);
  const initial = (user?.email?.[0] ?? "A").toUpperCase();
  const nav = isAdmin
    ? [
        ...baseNav,
        { href: "/dashboard/users", label: "Users", icon: UsersIcon },
      ]
    : [...baseNav];

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
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" />
              <span className="hidden sm:inline">Chat</span>
            </Link>
            <div className="hidden h-4 w-px bg-foreground/15 sm:block" />
            <div className="flex min-w-0 items-center gap-2">
              <AriaLogo className="h-4 w-auto shrink-0" />
              <span className="truncate text-[12px] font-semibold tracking-[0.14em]">
                ARIA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {planId === "free" ? (
              <Link
                href="/dashboard/plans"
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
              >
                <SparklesIcon className="size-3.5" />
                Upgrade
              </Link>
            ) : (
              <Link
                href="/dashboard/plans"
                className="hidden rounded-full border border-foreground/15 px-3 py-1.5 text-[11px] font-medium text-foreground/70 transition-colors hover:bg-foreground/5 sm:inline-flex"
              >
                {plan.name} plan
              </Link>
            )}
            <div className="flex size-8 items-center justify-center rounded-full bg-foreground text-[12px] font-medium text-background">
              {initial}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[4.5rem] lg:self-start">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Account">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-foreground/[0.07] font-medium text-foreground"
                      : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground lg:mt-2"
            >
              <LogOutIcon className="size-4" strokeWidth={1.75} />
              Log out
            </button>
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 max-w-2xl font-serif text-sm leading-relaxed text-foreground/60">
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </main>
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
