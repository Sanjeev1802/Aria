"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authErrorMessage, useAuth } from "@/lib/auth";
import { AuthShell, authInputClassName } from "@/components/auth/AuthShell";
import { LockIcon } from "lucide-react";

function CreatePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const { user, loading, signIn } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const linkError = token ? null : "This invitation link is invalid.";
  const error = submitError ?? linkError;

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!token) {
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/users/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json()) as { error?: string; email?: string };
      if (!response.ok) {
        setSubmitError(payload.error || "Unable to create your password.");
        return;
      }

      const email = payload.email?.trim().toLowerCase();
      if (!email) {
        setSubmitError("Unable to sign you in. Please try again.");
        return;
      }

      await signIn(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setSubmitError(
        authErrorMessage(err, "Unable to create your password. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your password"
      description="Set a password for your ARIA account to accept the team invitation."
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-brand-dark"
          >
            Password
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-dark/40" />
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting || !token}
              placeholder="At least 8 characters with upper, lower, and number"
              className={authInputClassName}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium text-brand-dark"
          >
            Confirm password
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-dark/40" />
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting || !token}
              placeholder="Re-enter your password"
              className={authInputClassName}
            />
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || loading || !token}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Continue to ARIA"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-brand-dark/60">
        Already have a password?{" "}
        <Link href="/sign-in" className="font-medium text-brand-dark hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function CreatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-foreground/60">
          Loading…
        </div>
      }
    >
      <CreatePasswordForm />
    </Suspense>
  );
}
