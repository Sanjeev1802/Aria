"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authErrorMessage, isNewPasswordRequiredError, useAuth } from "@/lib/auth";
import { AuthShell, authInputClassName } from "@/components/auth/AuthShell";
import { AtSignIcon, LockIcon, UserIcon } from "lucide-react";
import { Suspense } from "react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const { user, loading, signIn, completeNewPassword } = useAuth();
  const [step, setStep] = useState<"sign-in" | "new-password">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [requiredAttributes, setRequiredAttributes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
    }
  }, [loading, user, router, nextPath]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch (err) {
      if (isNewPasswordRequiredError(err)) {
        setRequiredAttributes(err.requiredAttributes);
        setStep("new-password");
        setError(null);
        return;
      }
      setError(authErrorMessage(err, "Unable to sign in. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const attributes: Record<string, string> = {};
      if (requiredAttributes.includes("name") && fullName.trim()) {
        attributes.name = fullName.trim();
      }
      await completeNewPassword(newPassword, attributes);
      router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch (err) {
      setError(authErrorMessage(err, "Unable to set your new password. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "new-password") {
    return (
      <AuthShell
        title="Set a new password"
        description="Your account was created with a temporary password. Choose a permanent password to continue."
      >
        <form className="flex flex-col gap-5" onSubmit={handleNewPassword}>
          {requiredAttributes.includes("name") ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="full-name" className="block text-sm font-medium text-brand-dark">
                Full name
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-dark/40" />
                <input
                  id="full-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={submitting}
                  placeholder="Your name"
                  className={authInputClassName}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-brand-dark"
            >
              New password
            </label>
            <div className="relative">
              <LockIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-dark/40" />
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={submitting}
                placeholder="At least 8 characters with upper, lower, and number"
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
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Saving password…" : "Continue to ARIA"}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setStep("sign-in");
              setNewPassword("");
              setFullName("");
              setRequiredAttributes([]);
              setError(null);
            }}
            className="text-sm text-brand-dark/60 hover:text-brand-dark disabled:opacity-60"
          >
            Back to sign in
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Sign in"
      description="Enter your email and password to access your ARIA workspace."
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="block text-sm font-medium text-brand-dark">
            Email
          </label>
          <div className="relative">
            <AtSignIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-dark/40" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting || loading}
              placeholder="your.email@example.com"
              className={authInputClassName}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-brand-dark"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-brand-dark/55 hover:text-brand-dark"
            >
              Forgot password
            </Link>
          </div>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-dark/40" />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting || loading}
              placeholder="Enter your password"
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
          disabled={submitting || loading}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-brand-dark/60">
        New to ARIA?{" "}
        <Link href="/sign-up" className="font-medium text-brand-dark hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-foreground/60">
          Loading…
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
