"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/chat/RequireAuth";
import { useAuth } from "@/lib/auth";

type ListedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: number;
};

function UsersTable() {
  const { getIdToken } = useAuth();
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getIdToken();
      if (!token) return;
      const response = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (!cancelled) setError("Unable to load users.");
        return;
      }
      const body = (await response.json()) as { users?: ListedUser[] };
      if (!cancelled) setUsers(body.users ?? []);
    })().catch(() => {
      if (!cancelled) setError("Unable to load users.");
    });
    return () => {
      cancelled = true;
    };
  }, [getIdToken]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="mt-1 text-sm text-black/60">
        Accounts stored in Aurora after Cognito sign-in.
      </p>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      <div className="mt-6 overflow-x-auto rounded-xl border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-black/10">
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">{user.status}</td>
              </tr>
            ))}
            {users.length === 0 && !error ? (
              <tr>
                <td className="px-4 py-6 text-black/50" colSpan={4}>
                  No users yet. Sign up to create the first row.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function UsersPage() {
  return (
    <RequireAuth>
      <UsersTable />
    </RequireAuth>
  );
}
