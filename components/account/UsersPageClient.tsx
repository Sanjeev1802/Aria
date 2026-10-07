"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { ConfirmDialog } from "@/components/chat/ConfirmDialog";
import {
  addWorkspaceUser,
  ensureWorkspaceUser,
  loadWorkspaceUsers,
  removeWorkspaceUser,
  updateWorkspaceUserRole,
  type WorkspaceRole,
  type WorkspaceUser,
} from "@/lib/aria/users";
import { getPlan, loadPlanId } from "@/lib/aria/plans";
import {
  MailPlusIcon,
  SearchIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react";

const fieldClass =
  "box-border h-10 w-full rounded-xl border border-foreground/12 bg-background px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-foreground/35 focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10";

export function UsersPageClient() {
  const { user, getIdToken } = useAuth();
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("user");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [planName, setPlanName] = useState("Business");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  function refresh() {
    if (user?.email) {
      ensureWorkspaceUser(user.email, user.displayName);
    }
    setUsers(loadWorkspaceUsers());
    setPlanName(getPlan(loadPlanId()).name);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load workspace roster for the signed-in user
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.role.includes(q),
    );
  }, [users, query]);

  const deleteTarget = users.find((u) => u.id === deleteId) ?? null;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const pendingCount = users.filter((u) => u.status === "invited").length;
  const actorEmail = user?.email ?? "";

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setInviteSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) {
        setFormError("Sign in again to send invitations.");
        return;
      }

      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, role }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setFormError(payload.error || "Could not send the invitation email.");
        return;
      }

      const result = addWorkspaceUser({ name, email, role });
      if (result.error) {
        setFormError(result.error);
        return;
      }

      setName("");
      setEmail("");
      setRole("user");
      setFormSuccess(
        `Invited ${result.user!.email} as ${result.user!.role}. An email with a sign-up link was sent.`,
      );
      setInviteOpen(false);
      refresh();
    } catch {
      setFormError("Could not send the invitation email.");
    } finally {
      setInviteSubmitting(false);
    }
  }

  function handleRoleChange(id: string, nextRole: WorkspaceRole) {
    setListError(null);
    const result = updateWorkspaceUserRole(id, nextRole, actorEmail);
    if (result.error) {
      setListError(result.error);
      return;
    }
    refresh();
  }

  function confirmDelete() {
    if (!deleteId) return;
    setListError(null);
    const result = removeWorkspaceUser(deleteId, actorEmail);
    if (result.error) {
      setListError(result.error);
      setDeleteId(null);
      return;
    }
    setDeleteId(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xs:flex-row sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-[0.12em] text-foreground/40 uppercase">
            Organization · {planName}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-foreground/55">
            Admins can invite, change roles, and remove members.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setInviteOpen(true);
            setFormError(null);
            setFormSuccess(null);
          }}
          className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-foreground px-3.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90 sm:w-auto"
        >
          <UserPlusIcon className="size-3.5" />
          Invite
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <MiniStat label="Members" value={users.length} />
        <MiniStat label="Admins" value={adminCount} />
        <MiniStat label="Pending" value={pendingCount} />
      </div>

      {formSuccess ? (
        <p className="rounded-lg border border-foreground/10 bg-card px-3 py-2 text-[12px] text-foreground/70">
          {formSuccess}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-card">
        <div className="flex flex-col gap-2 border-b border-foreground/10 px-3 py-2.5 sm:h-11 sm:flex-row sm:items-center sm:gap-3 sm:py-0">
          <p className="shrink-0 text-[13px] font-semibold text-foreground">
            People
          </p>
          <div className="flex h-8 w-full items-center gap-2 rounded-lg border border-foreground/10 bg-background px-2.5 sm:ml-auto sm:max-w-[14rem]">
            <SearchIcon className="size-3.5 shrink-0 text-foreground/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-foreground/35"
            />
          </div>
        </div>

        {listError ? (
          <p
            role="alert"
            className="border-b border-foreground/10 px-3 py-2 text-[12px] text-red-700"
          >
            {listError}
          </p>
        ) : null}

        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-[13px] text-foreground/45">
            No members found.
          </p>
        ) : (
          <ul>
            {filtered.map((member, index) => {
              const isYou =
                member.email === actorEmail.trim().toLowerCase();
              return (
                <li
                  key={member.id}
                  className={`flex flex-col gap-2.5 px-3 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:py-2.5 ${
                    index > 0 ? "border-t border-foreground/8" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-medium text-background">
                      {(member.name[0] || member.email[0] || "U").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium leading-tight text-foreground">
                        {member.name}
                        {isYou ? (
                          <span className="ml-1 text-[11px] font-normal text-foreground/40">
                            (you)
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-[11px] leading-tight text-foreground/45">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex h-8 flex-wrap items-center gap-1.5 pl-10 sm:pl-0">
                    <span
                      className={`inline-flex h-6 items-center rounded-full px-2 text-[10px] font-medium tracking-wide uppercase ${
                        member.status === "active"
                          ? "bg-foreground/8 text-foreground/55"
                          : "bg-foreground/12 text-foreground/70"
                      }`}
                    >
                      {member.status === "invited" ? "Invited" : "Active"}
                    </span>
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(
                          member.id,
                          e.target.value as WorkspaceRole,
                        )
                      }
                      className="h-7 min-w-0 rounded-md border border-foreground/12 bg-background px-1.5 text-[11px] text-foreground outline-none"
                      aria-label={`Role for ${member.name}`}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="button"
                      disabled={isYou}
                      onClick={() => setDeleteId(member.id)}
                      className="inline-flex size-7 items-center justify-center rounded-md text-foreground/35 transition-colors hover:bg-foreground/5 hover:text-red-600 disabled:pointer-events-none disabled:opacity-25"
                      aria-label={`Remove ${member.name}`}
                      title={isYou ? "You can’t remove yourself" : "Remove"}
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {inviteOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-foreground/30 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-title"
            className="max-h-[min(100dvh,40rem)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-foreground/10 bg-background shadow-xl sm:rounded-2xl"
          >
            <div className="border-b border-foreground/8 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2">
                <MailPlusIcon className="size-4 text-foreground/60" />
                <h3
                  id="invite-title"
                  className="text-[15px] font-semibold text-foreground"
                >
                  Invite team member
                </h3>
              </div>
              <p className="mt-1 text-[13px] text-foreground/50">
                Send an invite with Admin or User access.
              </p>
            </div>

            <form onSubmit={handleInvite} className="space-y-3 px-4 py-4 sm:px-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-foreground/70">
                  Full name
                </span>
                <input
                  className={fieldClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Lee"
                  required
                  autoFocus
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-foreground/70">
                  Work email
                </span>
                <input
                  type="email"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@company.com"
                  required
                />
              </label>
              <fieldset>
                <legend className="mb-2 text-[12px] font-medium text-foreground/70">
                  Role
                </legend>
                <div className="grid grid-cols-1 gap-2 xs:grid-cols-2 sm:grid-cols-2">
                  {(
                    [
                      ["user", "User", "Can chat in the workspace"],
                      ["admin", "Admin", "Invite, remove, manage roles"],
                    ] as const
                  ).map(([value, label, hint]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        role === value
                          ? "border-foreground/25 bg-foreground/[0.06]"
                          : "border-foreground/10 hover:bg-foreground/5"
                      }`}
                    >
                      <span className="block text-[13px] font-medium text-foreground">
                        {label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-foreground/50">
                        {hint}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {formError ? (
                <p role="alert" className="text-[13px] text-red-700">
                  {formError}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-full px-3.5 text-[13px] font-medium text-foreground/60 transition-colors hover:bg-foreground/5 sm:h-9"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9"
                >
                  {inviteSubmitting ? "Sending…" : "Send invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Remove this member?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” (${deleteTarget.email}) will lose access to this organization workspace.`
            : "This member will be removed from the workspace."
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-h-[3.5rem] flex-col justify-center rounded-xl border border-foreground/10 bg-card px-2 py-2 sm:h-[3.75rem] sm:px-3">
      <p className="truncate text-[10px] leading-none text-foreground/40 sm:text-[11px]">
        {label}
      </p>
      <p className="mt-1.5 text-base font-semibold leading-none tracking-tight text-foreground sm:text-lg">
        {value}
      </p>
    </div>
  );
}
