"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import {
  KeyRoundIcon,
  PlusIcon,
  CopyIcon,
  CheckIcon,
  Trash2Icon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react"

type ApiKey = {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsed: string
}

const initialKeys: ApiKey[] = [
  {
    id: "1",
    name: "Production — CRM widget",
    prefix: "aria_live_••••••••7f2a",
    createdAt: "12 Mar 2026",
    lastUsed: "2 hours ago",
  },
  {
    id: "2",
    name: "Staging — internal portal",
    prefix: "aria_test_••••••••c91e",
    createdAt: "28 Feb 2026",
    lastUsed: "Yesterday",
  },
]

export default function ApiKeysPage() {
  const [keys, setKeys] = useState(initialKeys)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [newKeyName, setNewKeyName] = useState("")
  const [justCreated, setJustCreated] = useState<string | null>(null)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = newKeyName.trim() || "Untitled key"
    const secret = `aria_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
    const id = String(Date.now())

    setKeys((prev) => [
      {
        id,
        name,
        prefix: `${secret.slice(0, 14)}••••••••${secret.slice(-4)}`,
        createdAt: "Just now",
        lastUsed: "Never",
      },
      ...prev,
    ])
    setJustCreated(secret)
    setNewKeyName("")
  }

  async function handleCopy(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1600)
    } catch {
      /* clipboard may be unavailable */
    }
  }

  function handleRevoke(id: string) {
    if (!window.confirm("Revoke this API key? Apps using it will stop working.")) {
      return
    }
    setKeys((prev) => prev.filter((k) => k.id !== id))
    if (justCreated && keys.find((k) => k.id === id)) {
      setJustCreated(null)
    }
  }

  return (
    <AppShell title="API Keys" eyebrow="Integration">
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="bn-callout">
            <span className="si text-[var(--bn-acc)]">Integrate — </span>
            Use an API key to embed ARIA chat in your applications. Keep keys
            secret; rotate them if exposed.
          </div>

          {justCreated && (
            <div className="bn-card border-[rgba(139,107,61,0.35)] p-5">
              <p className="bn-eyebrow mb-2">New key created</p>
              <p className="si mb-3 text-[14px] text-[var(--bn-ink-2)]">
                Copy this key now. You will not be able to see it again.
              </p>
              <div className="flex items-center gap-2 rounded-[12px] border-[0.5px] border-[var(--bn-line)] bg-[var(--bn-bg-2)] px-3 py-2.5">
                <code className="flex-1 overflow-x-auto font-mono text-[12.5px] text-[var(--bn-ink)]">
                  {justCreated}
                </code>
                <button
                  type="button"
                  className="bn-pill inline-flex items-center gap-1.5 px-3 py-1.5"
                  onClick={() => handleCopy("new", justCreated)}
                >
                  {copiedId === "new" ? (
                    <CheckIcon className="size-3.5 text-[var(--bn-success)]" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                  {copiedId === "new" ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                type="button"
                className="si mt-3 text-[12px] text-[var(--bn-ink-3)] underline-offset-2 hover:underline"
                onClick={() => setJustCreated(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleCreate} className="bn-card p-5">
            <p className="bn-eyebrow mb-2">Create key</p>
            <h2 className="bn-title mb-4 text-[22px]">
              Issue a key for your app
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Production — customer portal"
                className="h-11 flex-1 rounded-[12px] border-[0.5px] border-[rgba(13,11,7,0.14)] bg-[var(--bn-bg)] px-3.5 text-[13.5px] text-[var(--bn-ink)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--bn-ink-3)] focus:border-[var(--bn-acc)] focus:shadow-[0_0_0_3px_rgba(139,107,61,0.1)]"
              />
              <button type="submit" className="ask-submit h-11 gap-2 px-5">
                <PlusIcon className="size-4" />
                Create key
              </button>
            </div>
          </form>

          <section>
            <p className="bn-eyebrow mb-1">Active keys</p>
            <h2 className="bn-title mb-4 text-[22px]">Your keys</h2>
            <div className="space-y-3">
              {keys.map((key) => (
                <div key={key.id} className="bn-list-item items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[rgba(139,107,61,0.08)]">
                      <KeyRoundIcon className="size-4 text-[var(--bn-acc)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[var(--bn-ink)]">
                        {key.name}
                      </p>
                      <p className="mt-1 font-mono text-[12px] text-[var(--bn-ink-2)]">
                        {revealed[key.id]
                          ? key.prefix.replaceAll("•", "x")
                          : key.prefix}
                      </p>
                      <p className="si mt-1.5 text-[12px] text-[var(--bn-ink-3)]">
                        Created {key.createdAt} · Last used {key.lastUsed}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-full text-[var(--bn-ink-3)] transition-colors hover:bg-[rgba(139,107,61,0.08)] hover:text-[var(--bn-acc)]"
                      aria-label={revealed[key.id] ? "Hide key" : "Show key"}
                      onClick={() =>
                        setRevealed((prev) => ({
                          ...prev,
                          [key.id]: !prev[key.id],
                        }))
                      }
                    >
                      {revealed[key.id] ? (
                        <EyeOffIcon className="size-3.5" />
                      ) : (
                        <EyeIcon className="size-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-full text-[var(--bn-ink-3)] transition-colors hover:bg-[rgba(139,107,61,0.08)] hover:text-[var(--bn-acc)]"
                      aria-label="Copy key prefix"
                      onClick={() => handleCopy(key.id, key.prefix)}
                    >
                      {copiedId === key.id ? (
                        <CheckIcon className="size-3.5 text-[var(--bn-success)]" />
                      ) : (
                        <CopyIcon className="size-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-full text-[var(--bn-ink-3)] transition-colors hover:bg-[rgba(184,65,58,0.08)] hover:text-[var(--bn-error)]"
                      aria-label="Revoke key"
                      onClick={() => handleRevoke(key.id)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  )
}
