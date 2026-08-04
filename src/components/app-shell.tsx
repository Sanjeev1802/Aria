"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase"
import { useFirebaseUser } from "@/hooks/use-firebase-user"
import {
  MessageSquareIcon,
  HistoryIcon,
  KeyRoundIcon,
  SettingsIcon,
  LogOutIcon,
  SparklesIcon,
} from "lucide-react"

const navItems = [
  { href: "/chat", label: "Chat", icon: MessageSquareIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/api-keys", label: "API Keys", icon: KeyRoundIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

export function AppShell({
  children,
  title,
  eyebrow = "Workspace",
}: {
  children: React.ReactNode
  title: string
  eyebrow?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useFirebaseUser()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const email = user?.email ?? ""
  const initials = (email[0] || "U").toUpperCase()

  useEffect(() => {
    if (!confirmLogout) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmLogout(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [confirmLogout])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await signOut(getFirebaseAuth())
      router.push("/login")
    } finally {
      setLoggingOut(false)
      setConfirmLogout(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bn-bg)] text-[var(--bn-ink)]">
      <aside className="flex w-56 shrink-0 flex-col border-r-[0.5px] border-[var(--bn-line)] bg-[var(--bn-bg-2)]">
        <div className="flex items-center gap-2.5 border-b-[0.5px] border-[var(--bn-line)] px-4 py-5">
          <div className="flex size-7 items-center justify-center rounded-[8px] bg-[var(--bn-acc)]">
            <SparklesIcon className="size-3.5 text-white" />
          </div>
          <div className="leading-none">
            <span className="si bn-title text-[22px] tracking-[-0.4px] text-[var(--bn-ink)]">
              BNII ARIA
            </span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                data-active={active}
                className="bn-nav-item"
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t-[0.5px] border-[var(--bn-line)] p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-[10px] px-3 py-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-[var(--bn-acc)] text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-[13px] font-medium text-[var(--bn-ink)]">
                {user?.displayName || email.split("@")[0] || "User"}
              </p>
              <p className="si truncate text-[11px] text-[var(--bn-ink-3)]">
                {email || "Not signed in"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="bn-nav-item text-[var(--bn-ink-3)]"
          >
            <LogOutIcon className="size-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b-[0.5px] border-[var(--bn-line)] bg-[var(--bn-bg)] px-6 py-3.5">
          <div className="flex items-baseline gap-3">
            <span className="bn-eyebrow">{eyebrow}</span>
            <span className="si bn-title text-[20px]">{title}</span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>

      {confirmLogout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(13,11,7,0.35)] p-4"
          role="presentation"
          onClick={() => !loggingOut && setConfirmLogout(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-desc"
            className="bn-card w-full max-w-sm p-6 shadow-[0_18px_40px_rgba(13,11,7,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="bn-eyebrow mb-2">Account</p>
            <h2 id="logout-title" className="bn-title mb-2 text-[24px]">
              Log out of <span className="si text-[var(--bn-acc)]">BNII ARIA</span>?
            </h2>
            <p id="logout-desc" className="si mb-6 text-[14px] text-[var(--bn-ink-2)]">
              You will need to sign in again to access chat and API keys.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="bn-pill px-4 py-2 text-[13px]"
                onClick={() => setConfirmLogout(false)}
                disabled={loggingOut}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ask-submit h-10 px-5"
                style={{ background: "var(--bn-error)" }}
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
