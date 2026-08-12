"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@aria/auth";
import { ConfirmDialog } from "@/components/chat/ConfirmDialog";
import {
  SettingsDialog,
  type SettingsTab,
} from "@/components/account/SettingsDialog";
import {
  getPlan,
  isTeamPlan,
  loadPlanId,
  type PlanId,
} from "@/lib/aria/plans";
import {
  ensureWorkspaceUser,
  isAdminEmail,
} from "@/lib/aria/users";
import {
  ChevronUpIcon,
  CreditCardIcon,
  HelpCircleIcon,
  LogOutIcon,
  SettingsIcon,
  SparklesIcon,
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
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

  function openSettings(tab: SettingsTab) {
    setOpen(false);
    setSettingsTab(tab);
    setSettingsOpen(true);
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
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-[min(100%,17.5rem)] overflow-hidden rounded-2xl border border-foreground/10 bg-background shadow-[0_12px_40px_rgba(20,20,19,0.14)]"
        >
          <div className="border-b border-foreground/8 px-3.5 py-3">
            <p className="truncate text-[13px] font-medium text-foreground">
              {user?.email ?? "Signed in"}
            </p>
            <p className="mt-0.5 text-[12px] text-foreground/45">
              {plan.name}
              {isAdmin && isTeamPlan(planId) ? " · Admin" : ""}
            </p>
          </div>

          {planId === "free" || planId === "pro" ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => go("/dashboard/plans")}
              className="flex w-full items-center gap-2.5 border-b border-foreground/8 px-3.5 py-2.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-foreground/[0.04]"
            >
              <SparklesIcon className="size-4 text-foreground/70" strokeWidth={1.75} />
              {planId === "free" ? "Upgrade plan" : "Explore Business"}
            </button>
          ) : null}

          <div className="p-1.5">
            <MenuItem
              icon={UserIcon}
              label="Profile"
              onClick={() => openSettings("profile")}
            />
            <MenuItem
              icon={SettingsIcon}
              label="Settings"
              onClick={() => openSettings("general")}
            />
            <MenuItem
              icon={CreditCardIcon}
              label="Plans"
              onClick={() => go("/dashboard/plans")}
            />
          </div>

          <div className="border-t border-foreground/8 p-1.5">
            <MenuItem
              icon={HelpCircleIcon}
              label="Help & support"
              onClick={() => go("/contact")}
            />
            <MenuItem
              icon={LogOutIcon}
              label="Log out"
              destructive
              onClick={() => {
                setOpen(false);
                setLogoutOpen(true);
              }}
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full min-w-0 items-center gap-2.5 rounded-xl px-1.5 text-left transition-colors hover:bg-foreground/5"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Account menu"
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-medium text-background">
          {initial}
        </div>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
              {displayName}
            </span>
            <ChevronUpIcon
              className={`size-3.5 shrink-0 text-foreground/40 transition-transform ${open ? "" : "rotate-180"}`}
            />
          </>
        ) : null}
      </button>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialTab={settingsTab}
      />

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

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors ${
        destructive
          ? "text-red-600 hover:bg-red-600/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-400/10 dark:hover:text-red-300"
          : "text-foreground/80 hover:bg-foreground/[0.05] hover:text-foreground"
      }`}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
      {label}
    </button>
  );
}
