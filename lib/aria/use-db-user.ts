"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

type DbUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  status: "active" | "invited" | "disabled";
};

export function useDbUser() {
  const { user, getIdToken } = useAuth();
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        if (!cancelled) {
          setDbUser(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const token = await getIdToken();
        if (!token) {
          if (!cancelled) setDbUser(null);
          return;
        }

        const response = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (!cancelled) setDbUser(null);
          return;
        }

        const payload = (await response.json()) as { user?: DbUser };
        if (!cancelled) setDbUser(payload.user ?? null);
      } catch {
        if (!cancelled) setDbUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, getIdToken]);

  return {
    dbUser,
    loading,
    isAdmin: dbUser?.role === "admin",
  };
}
