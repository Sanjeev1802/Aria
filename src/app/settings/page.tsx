"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("User")
  const [email] = useState("user@aria.ai")
  const [defaultModel, setDefaultModel] = useState("aria-research")
  const [citations, setCitations] = useState(true)
  const [saved, setSaved] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <AppShell title="Settings" eyebrow="Account">
      <main className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSave} className="mx-auto max-w-2xl space-y-6">
          <section className="bn-card p-5">
            <p className="bn-eyebrow mb-2">Profile</p>
            <h2 className="bn-title mb-4 text-[22px]">Your account</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.4px] text-[var(--bn-ink-3)]">
                  Display name
                </span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-11 w-full rounded-[12px] border-[0.5px] border-[rgba(13,11,7,0.14)] bg-[var(--bn-bg)] px-3.5 text-[13.5px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--bn-acc)] focus:shadow-[0_0_0_3px_rgba(139,107,61,0.1)]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.4px] text-[var(--bn-ink-3)]">
                  Email
                </span>
                <input
                  value={email}
                  disabled
                  className="h-11 w-full rounded-[12px] border-[0.5px] border-[var(--bn-line)] bg-[var(--bn-bg-2)] px-3.5 text-[13.5px] text-[var(--bn-ink-2)]"
                />
                <span className="si mt-1.5 block text-[12px] text-[var(--bn-ink-3)]">
                  Managed by your identity provider.
                </span>
              </label>
            </div>
          </section>

          <section className="bn-card p-5">
            <p className="bn-eyebrow mb-2">Defaults</p>
            <h2 className="bn-title mb-4 text-[22px]">Chat preferences</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.4px] text-[var(--bn-ink-3)]">
                  Default model
                </span>
                <select
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="h-11 w-full rounded-[12px] border-[0.5px] border-[rgba(13,11,7,0.14)] bg-[var(--bn-bg)] px-3.5 text-[13.5px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--bn-acc)] focus:shadow-[0_0_0_3px_rgba(139,107,61,0.1)]"
                >
                  <option value="aria-research">ARIA Research</option>
                  <option value="aria-fast">ARIA Fast</option>
                </select>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border-[0.5px] border-[var(--bn-line)] px-4 py-3 transition-colors hover:bg-[rgba(139,107,61,0.04)]">
                <input
                  type="checkbox"
                  checked={citations}
                  onChange={(e) => setCitations(e.target.checked)}
                  className="mt-1 accent-[var(--bn-acc)]"
                />
                <span>
                  <span className="block text-[13.5px] font-medium text-[var(--bn-ink)]">
                    Include citations by default
                  </span>
                  <span className="si mt-0.5 block text-[12px] text-[var(--bn-ink-3)]">
                    Board-ready briefs will attach source references.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <div className="flex items-center justify-between">
            <p className="si text-[13px] text-[var(--bn-ink-3)]">
              {saved ? "Preferences saved." : "Changes apply to new chats."}
            </p>
            <button type="submit" className="ask-submit h-11 px-6">
              Save settings
            </button>
          </div>
        </form>
      </main>
    </AppShell>
  )
}
