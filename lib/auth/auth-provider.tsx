"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentSession,
  signIn as cognitoSignIn,
  signOutCurrentUser,
} from "./cognito-client";
import type { AuthUser } from "./types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  getIdToken: () => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function persistSessionCookie(idToken: string | null) {
  if (!idToken) {
    await fetch("/api/auth/session", { method: "DELETE" });
    return;
  }
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentSession()
      .then(async (next) => {
        if (cancelled) return;
        setUser(next);
        if (next) await persistSessionCookie(next.idToken);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getIdToken = useCallback(async () => {
    const session = await getCurrentSession();
    if (session) {
      setUser(session);
      return session.idToken;
    }
    setUser(null);
    return null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      getIdToken,
      async signIn(email, password) {
        const next = await cognitoSignIn(email, password);
        await persistSessionCookie(next.idToken);
        setUser(next);
        return next;
      },
      async signOut() {
        signOutCurrentUser();
        await persistSessionCookie(null);
        setUser(null);
      },
    }),
    [user, loading, getIdToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
