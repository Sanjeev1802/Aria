"use client"

import { useMemo, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { useFirebaseUser } from "@/hooks/use-firebase-user"
import {
  createApiKeyRecord,
  loadApiKeys,
  maskApiKey,
  saveApiKeys,
  type StoredApiKey,
} from "@/lib/api-keys"
import { PlusIcon, CopyIcon, CheckIcon, Trash2Icon } from "lucide-react"

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function ApiKeysPage() {
  const { user, loading } = useFirebaseUser()
  const uid = user?.uid ?? null
  const [listVersion, setListVersion] = useState(0)
  const [projectName, setProjectName] = useState("")
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [oneTimeSecret, setOneTimeSecret] = useState<{
    projectName: string
    secret: string
  } | null>(null)
  const [revokeId, setRevokeId] = useState<string | null>(null)

  const keys = useMemo(() => {
    if (!uid) return [] as StoredApiKey[]
    return loadApiKeys(uid)
    // listVersion forces reload after create/revoke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, listVersion])

  function persist(next: StoredApiKey[]) {
    if (!uid) return
    saveApiKeys(uid, next)
    setListVersion((v) => v + 1)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const name = projectName.trim()
    if (!name) {
      setError("Project name is required.")
      return
    }
    if (!uid) {
      setError("Sign in to create an API key.")
      return
    }

    setCreating(true)
    try {
      const { record, secret } = await createApiKeyRecord(name)
      persist([record, ...keys])
      setOneTimeSecret({ projectName: name, secret })
      setProjectName("")
      setCopied(false)
    } finally {
      setCreating(false)
    }
  }

  async function handleCopySecret() {
    if (!oneTimeSecret) return
    try {
      await navigator.clipboard.writeText(oneTimeSecret.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setError("Could not copy to clipboard.")
    }
  }

  function confirmRevoke(id: string) {
    persist(keys.filter((k) => k.id !== id))
    setRevokeId(null)
  }

  return (
    <AppShell title="API Keys" eyebrow="Integration">
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <form onSubmit={handleCreate} className="bn-card p-5">
            <p className="bn-eyebrow mb-2">Create key</p>
            <h2 className="bn-title mb-4 text-[22px]">
              Create key for a{" "}
              <span className="si text-[var(--bn-acc)]">project</span>
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                required
                className="h-11 flex-1 rounded-[12px] border-[0.5px] border-[rgba(13,11,7,0.14)] bg-[var(--bn-bg)] px-3.5 text-[13.5px] text-[var(--bn-ink)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--bn-ink-3)] focus:border-[var(--bn-acc)] focus:shadow-[0_0_0_3px_rgba(139,107,61,0.1)]"
              />
              <button
                type="submit"
                className="ask-submit h-11 gap-2 px-5"
                disabled={creating || loading || !uid}
              >
                <PlusIcon className="size-4" />
                {creating ? "Creating…" : "Create key"}
              </button>
            </div>
            {error && (
              <p className="mt-3 text-[13px] text-[var(--bn-error)]">{error}</p>
            )}
          </form>

          <section className="bn-card overflow-hidden p-0">
            <div className="border-b-[0.5px] border-[var(--bn-line)] px-5 py-4">
              <p className="bn-eyebrow mb-1">Keys</p>
              <h2 className="bn-title text-[22px]">API key list</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr>
                    {["Project", "API key", "Created", "Actions"].map((col) => (
                      <th
                        key={col}
                        className="border-b border-[var(--bn-acc)] px-5 py-3 text-[11.5px] font-medium uppercase tracking-[0.3px] text-[var(--bn-ink-2)]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-10 text-center text-[13.5px] text-[var(--bn-ink-3)]"
                      >
                        Loading…
                      </td>
                    </tr>
                  ) : keys.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center">
                        <p className="bn-title text-[20px]">No API keys yet</p>
                        <p className="si mt-1 text-[13px] text-[var(--bn-ink-3)]">
                          Create a key with a project name to get started.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    keys.map((key) => (
                      <tr
                        key={key.id}
                        className="border-b-[0.5px] border-[var(--bn-line-soft)] last:border-b-0"
                      >
                        <td className="px-5 py-3.5 text-[13.5px] font-medium text-[var(--bn-ink)]">
                          {key.projectName}
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="font-mono text-[12.5px] text-[var(--bn-ink-2)]">
                            {maskApiKey(key.prefix, key.suffix)}
                          </code>
                          <p className="si mt-0.5 text-[11px] text-[var(--bn-ink-3)]">
                            Encrypted · full key hidden
                          </p>
                        </td>
                        <td className="si px-5 py-3.5 text-[13px] text-[var(--bn-ink-3)]">
                          {formatDate(key.createdAt)}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-[rgba(13,11,7,0.12)] px-3 py-1.5 text-[12px] text-[var(--bn-ink-2)] transition-colors hover:border-[var(--bn-error)] hover:bg-[rgba(184,65,58,0.06)] hover:text-[var(--bn-error)]"
                            onClick={() => setRevokeId(key.id)}
                          >
                            <Trash2Icon className="size-3.5" />
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {oneTimeSecret && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(13,11,7,0.35)] p-4"
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="key-once-title"
            className="bn-card w-full max-w-lg p-6 shadow-[0_18px_40px_rgba(13,11,7,0.22)]"
          >
            <p className="bn-eyebrow mb-2">Secure your key</p>
            <h2 id="key-once-title" className="bn-title mb-2 text-[24px]">
              Copy your key <span className="si text-[var(--bn-acc)]">now</span>
            </h2>
            <p className="si mb-1 text-[14px] text-[var(--bn-ink-2)]">
              Project: {oneTimeSecret.projectName}
            </p>
            <p className="si mb-4 text-[13px] text-[var(--bn-ink-3)]">
              This is the only time the full key is shown. After you close this
              dialog it is stored encrypted (hashed) and cannot be revealed
              again.
            </p>
            <div className="mb-5 flex items-center gap-2 rounded-[12px] border-[0.5px] border-[rgba(139,107,61,0.35)] bg-[rgba(139,107,61,0.06)] px-3 py-2.5">
              <code className="flex-1 overflow-x-auto font-mono text-[12.5px] text-[var(--bn-ink)]">
                {oneTimeSecret.secret}
              </code>
              <button
                type="button"
                className="bn-pill inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5"
                onClick={handleCopySecret}
              >
                {copied ? (
                  <CheckIcon className="size-3.5 text-[var(--bn-success)]" />
                ) : (
                  <CopyIcon className="size-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="ask-submit h-10 px-5"
                onClick={() => setOneTimeSecret(null)}
              >
                I&apos;ve saved the key
              </button>
            </div>
          </div>
        </div>
      )}

      {revokeId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(13,11,7,0.35)] p-4"
          role="presentation"
          onClick={() => setRevokeId(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="bn-card w-full max-w-sm p-6 shadow-[0_18px_40px_rgba(13,11,7,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="bn-title mb-2 text-[22px]">Revoke this key?</h2>
            <p className="si mb-6 text-[14px] text-[var(--bn-ink-2)]">
              Apps using this key will stop working immediately.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="bn-pill px-4 py-2 text-[13px]"
                onClick={() => setRevokeId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ask-submit h-10 px-5"
                style={{ background: "var(--bn-error)" }}
                onClick={() => confirmRevoke(revokeId)}
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
