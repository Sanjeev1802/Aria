"use client"

import { useMemo, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { useFirebaseUser } from "@/hooks/use-firebase-user"
import {
  loadTeamMembers,
  saveTeamMembers,
  ROLE_LABELS,
  type TeamMember,
  type TeamRole,
} from "@/lib/team"
import { UserPlusIcon, Trash2Icon } from "lucide-react"

export default function SettingsPage() {
  const { user, loading } = useFirebaseUser()
  const uid = user?.uid ?? null
  const email = user?.email ?? ""
  const firebaseName =
    user?.displayName || user?.email?.split("@")[0] || ""

  const [displayName, setDisplayName] = useState<string | null>(null)
  const [defaultModel, setDefaultModel] = useState("aria-research")
  const [citations, setCitations] = useState(true)
  const [saved, setSaved] = useState(false)

  const [teamVersion, setTeamVersion] = useState(0)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<TeamRole>("viewer")
  const [teamError, setTeamError] = useState("")
  const [teamMessage, setTeamMessage] = useState("")

  const members = useMemo(() => {
    if (!uid) return [] as TeamMember[]
    return loadTeamMembers(uid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, teamVersion])

  const nameValue = displayName ?? firebaseName

  function persistTeam(next: TeamMember[]) {
    if (!uid) return
    saveTeamMembers(uid, next)
    setTeamVersion((v) => v + 1)
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setTeamError("")
    setTeamMessage("")

    const invite = inviteEmail.trim().toLowerCase()
    if (!invite || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite)) {
      setTeamError("Enter a valid email address.")
      return
    }
    if (!uid) {
      setTeamError("Sign in to invite members.")
      return
    }
    if (invite === email.toLowerCase()) {
      setTeamError("You cannot invite your own account.")
      return
    }
    if (members.some((m) => m.email === invite)) {
      setTeamError("That email is already on the team.")
      return
    }

    persistTeam([
      {
        id: crypto.randomUUID(),
        email: invite,
        role: inviteRole,
        status: "pending",
        invitedAt: new Date().toISOString(),
      },
      ...members,
    ])
    setInviteEmail("")
    setInviteRole("viewer")
    setTeamMessage(`Invite sent to ${invite}.`)
  }

  function updateRole(id: string, role: TeamRole) {
    persistTeam(members.map((m) => (m.id === id ? { ...m, role } : m)))
  }

  function removeMember(id: string) {
    persistTeam(members.filter((m) => m.id !== id))
  }

  return (
    <AppShell title="Settings" eyebrow="Account">
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-2">
          {/* Left — Profile + Defaults */}
          <form
            onSubmit={handleSaveProfile}
            className="flex min-h-0 flex-col gap-4 overflow-y-auto"
          >
            <section className="bn-card shrink-0 p-5">
              <p className="bn-eyebrow mb-2">Profile</p>
              <h2 className="bn-title mb-4 text-[22px]">Your account</h2>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.4px] text-[var(--bn-ink-3)]">
                    Display name
                  </span>
                  <input
                    value={nameValue}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-11 w-full rounded-[12px] border-[0.5px] border-[rgba(13,11,7,0.14)] bg-[var(--bn-bg)] px-3.5 text-[13.5px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--bn-acc)] focus:shadow-[0_0_0_3px_rgba(139,107,61,0.1)]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.4px] text-[var(--bn-ink-3)]">
                    Email
                  </span>
                  <input
                    value={loading ? "Loading…" : email || "Not signed in"}
                    disabled
                    className="h-11 w-full rounded-[12px] border-[0.5px] border-[var(--bn-line)] bg-[var(--bn-bg-2)] px-3.5 text-[13.5px] text-[var(--bn-ink-2)]"
                  />
                  <span className="si mt-1.5 block text-[12px] text-[var(--bn-ink-3)]">
                    Signed-in email from Firebase Authentication.
                  </span>
                </label>
              </div>
            </section>

            <section className="bn-card flex min-h-0 flex-1 flex-col p-5">
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

              <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                <p className="si text-[13px] text-[var(--bn-ink-3)]">
                  {saved ? "Preferences saved." : "Changes apply to new chats."}
                </p>
                <button type="submit" className="ask-submit h-11 shrink-0 px-6">
                  Save settings
                </button>
              </div>
            </section>
          </form>

          {/* Right — Organization / Team */}
          <section className="bn-card flex min-h-0 flex-col overflow-hidden p-0">
            <div className="shrink-0 border-b-[0.5px] border-[var(--bn-line)] px-5 py-4">
              <p className="bn-eyebrow mb-1">Organization</p>
              <h2 className="bn-title text-[22px]">Team</h2>
              <p className="si mt-1 text-[13px] text-[var(--bn-ink-3)]">
                Invite members and assign roles for your workspace.
              </p>
            </div>

            <form
              onSubmit={handleInvite}
              className="shrink-0 space-y-3 border-b-[0.5px] border-[var(--bn-line)] px-5 py-4"
            >
              <p className="text-[12px] font-medium uppercase tracking-[0.4px] text-[var(--bn-ink-3)]">
                Invite member
              </p>
              <div className="flex flex-col gap-2 xl:flex-row">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="h-11 flex-1 rounded-[12px] border-[0.5px] border-[rgba(13,11,7,0.14)] bg-[var(--bn-bg)] px-3.5 text-[13.5px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--bn-ink-3)] focus:border-[var(--bn-acc)] focus:shadow-[0_0_0_3px_rgba(139,107,61,0.1)]"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                  className="h-11 rounded-[12px] border-[0.5px] border-[rgba(13,11,7,0.14)] bg-[var(--bn-bg)] px-3.5 text-[13.5px] outline-none focus:border-[var(--bn-acc)] focus:shadow-[0_0_0_3px_rgba(139,107,61,0.1)] xl:w-32"
                >
                  {(Object.keys(ROLE_LABELS) as TeamRole[]).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="ask-submit h-11 gap-2 px-5"
                  disabled={!uid}
                >
                  <UserPlusIcon className="size-4" />
                  Invite
                </button>
              </div>
              {teamError && (
                <p className="text-[13px] text-[var(--bn-error)]">{teamError}</p>
              )}
              {teamMessage && (
                <p className="text-[13px] text-[var(--bn-success)]">{teamMessage}</p>
              )}
            </form>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-[var(--bn-bg)]">
                  <tr>
                    {["Member", "Role", "Status", "Actions"].map((col) => (
                      <th
                        key={col}
                        className="border-b border-[var(--bn-acc)] px-4 py-3 text-[11.5px] font-medium uppercase tracking-[0.3px] text-[var(--bn-ink-2)]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {user && (
                    <tr className="border-b-[0.5px] border-[var(--bn-line-soft)] bg-[rgba(139,107,61,0.04)]">
                      <td className="px-4 py-3 text-[13px] font-medium text-[var(--bn-ink)]">
                        <span className="block max-w-[180px] truncate">
                          {email}
                        </span>
                        <span className="si text-[11px] text-[var(--bn-acc)]">
                          you
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[var(--bn-ink-2)]">
                        Admin
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[rgba(45,106,79,0.1)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.4px] text-[var(--bn-success)]">
                          active
                        </span>
                      </td>
                      <td className="si px-4 py-3 text-[12px] text-[var(--bn-ink-3)]">
                        —
                      </td>
                    </tr>
                  )}
                  {!uid ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center text-[13.5px] text-[var(--bn-ink-3)]"
                      >
                        Sign in to manage your team.
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="si px-4 py-8 text-center text-[13px] text-[var(--bn-ink-3)]"
                      >
                        No invited members yet. Add a colleague above.
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b-[0.5px] border-[var(--bn-line-soft)] last:border-b-0"
                      >
                        <td className="max-w-[180px] truncate px-4 py-3 text-[13px] text-[var(--bn-ink)]">
                          {member.email}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={member.role}
                            onChange={(e) =>
                              updateRole(member.id, e.target.value as TeamRole)
                            }
                            className="h-9 rounded-[10px] border-[0.5px] border-[rgba(13,11,7,0.14)] bg-[var(--bn-bg)] px-2 text-[12.5px] outline-none focus:border-[var(--bn-acc)]"
                          >
                            {(Object.keys(ROLE_LABELS) as TeamRole[]).map(
                              (role) => (
                                <option key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </option>
                              )
                            )}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[rgba(139,107,61,0.1)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.4px] text-[var(--bn-acc)]">
                            {member.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-[rgba(13,11,7,0.12)] px-2.5 py-1.5 text-[12px] text-[var(--bn-ink-2)] transition-colors hover:border-[var(--bn-error)] hover:bg-[rgba(184,65,58,0.06)] hover:text-[var(--bn-error)]"
                            onClick={() => removeMember(member.id)}
                          >
                            <Trash2Icon className="size-3.5" />
                            Remove
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
    </AppShell>
  )
}
