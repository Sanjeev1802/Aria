"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@aria/auth";
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
import {
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";

const fieldClass =
  "box-border h-10 w-full rounded-xl border border-foreground/12 bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/35 focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10";

export function UsersPageClient() {
  const { user } = useAuth();
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("user");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  function refresh() {
    if (user?.email) {
      ensureWorkspaceUser(user.email, user.displayName);
    }
    setUsers(loadWorkspaceUsers());
  }

  useEffect(() => {
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
  const actorEmail = user?.email ?? "";

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const result = addWorkspaceUser({ name, email, role });
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setName("");
    setEmail("");
    setRole("user");
    setFormSuccess(`Invited ${result.user!.email} as ${result.user!.role}.`);
    refresh();
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
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-foreground/10 bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/40">
            Total users
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-foreground/10 bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/40">
            Admins
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{adminCount}</p>
        </div>
        <div className="rounded-2xl border border-foreground/10 bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/40">
            Invited
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {users.filter((u) => u.status === "invited").length}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-foreground/10 bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <PlusIcon className="size-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Add new user</h2>
        </div>
        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2">
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
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-foreground/70">
              Email
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
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-[12px] font-medium text-foreground/70">
              Role
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`flex items-start gap-2.5 rounded-xl border px-3 py-3 text-left transition-colors ${
                  role === "user"
                    ? "border-foreground/25 bg-foreground/[0.06]"
                    : "border-foreground/10 hover:bg-foreground/5"
                }`}
              >
                <UserIcon className="mt-0.5 size-4 shrink-0 text-foreground/55" />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    User
                  </span>
                  <span className="mt-0.5 block text-[12px] text-foreground/55">
                    Can chat and manage their own profile, plans, and usage.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex items-start gap-2.5 rounded-xl border px-3 py-3 text-left transition-colors ${
                  role === "admin"
                    ? "border-foreground/25 bg-foreground/[0.06]"
                    : "border-foreground/10 hover:bg-foreground/5"
                }`}
              >
                <ShieldIcon className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Admin
                  </span>
                  <span className="mt-0.5 block text-[12px] text-foreground/55">
                    Can view all users, invite people, and change roles.
                  </span>
                </span>
              </button>
            </div>
          </fieldset>

          {formError ? (
            <p role="alert" className="text-sm text-red-700 sm:col-span-2">
              {formError}
            </p>
          ) : null}
          {formSuccess ? (
            <p className="text-sm text-foreground/65 sm:col-span-2">{formSuccess}</p>
          ) : null}

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <PlusIcon className="size-3.5" />
              Add user
            </button>
            <p className="mt-2 text-[11px] text-foreground/40">
              Demo invite — stored in this workspace roster. Connect Firebase Admin
              later to create real login accounts.
            </p>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-foreground/10 bg-card p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-foreground">All users</h2>
          <div className="flex h-9 max-w-sm items-center gap-2 rounded-xl border border-foreground/12 bg-background px-2.5">
            <SearchIcon className="size-3.5 text-foreground/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, role…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/35"
            />
          </div>
        </div>

        {listError ? (
          <p role="alert" className="mb-3 text-sm text-red-700">
            {listError}
          </p>
        ) : null}

        {filtered.length === 0 ? (
          <p className="text-sm text-foreground/50">No users found.</p>
        ) : (
          <ul className="divide-y divide-foreground/10 overflow-hidden rounded-xl border border-foreground/10">
            {filtered.map((member) => {
              const isYou =
                member.email === actorEmail.trim().toLowerCase();
              return (
                <li
                  key={member.id}
                  className="flex flex-col gap-3 bg-background/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[12px] font-medium text-background">
                      {(member.name[0] || member.email[0] || "U").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {member.name}
                        {isYou ? (
                          <span className="ml-1.5 text-[11px] font-normal text-foreground/40">
                            (you)
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-[12px] text-foreground/50">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        member.status === "active"
                          ? "bg-foreground/10 text-foreground/70"
                          : "bg-accent/20 text-foreground/80"
                      }`}
                    >
                      {member.status}
                    </span>
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(
                          member.id,
                          e.target.value as WorkspaceRole,
                        )
                      }
                      className="h-8 rounded-lg border border-foreground/12 bg-background px-2 text-[12px] text-foreground outline-none"
                      aria-label={`Role for ${member.name}`}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="button"
                      disabled={isYou}
                      onClick={() => setDeleteId(member.id)}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-red-700 disabled:opacity-30"
                      aria-label={`Remove ${member.name}`}
                      title={isYou ? "You can’t remove yourself" : "Remove user"}
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Remove this user?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” (${deleteTarget.email}) will be removed from the workspace roster.`
            : "This user will be removed from the workspace."
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
