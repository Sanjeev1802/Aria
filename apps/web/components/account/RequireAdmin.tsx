"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@aria/auth";
import {
  ensureWorkspaceUser,
  isAdminEmail,
} from "@/lib/aria/users";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user?.email) {
      router.replace("/sign-in");
      return;
    }
    ensureWorkspaceUser(user.email, user.displayName);
    const ok = isAdminEmail(user.email);
    setAllowed(ok);
    setChecking(false);
    if (!ok) {
      router.replace("/dashboard/profile");
    }
  }, [user, loading, router]);

  if (loading || checking || !allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-foreground">
        <p className="text-sm text-foreground/60">
          {loading || checking ? "Checking access…" : "Redirecting…"}
        </p>
      </div>
    );
  }

  return children;
}
