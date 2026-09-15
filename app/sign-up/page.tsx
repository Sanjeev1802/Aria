"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authErrorMessage } from "@/lib/auth";
import { signUp } from "@/lib/auth/cognito-client";
import { AuthShell, authInputClassName } from "@/components/auth/AuthShell";
import { AtSignIcon, LockIcon, UserIcon } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signUp({ email, password, fullName });
      if (result.userConfirmed) {
        router.replace("/sign-in");
        return;
      }
      router.replace(`/confirm?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(authErrorMessage(err, "Unable to create an account. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create an account"
      description="Sign up with your work email to start using the ARIA workspace."
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="block text-sm font-medium text-brand-dark">
            Full name
          </label>
          <div className="relative">
            <UserIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-dark/40" />
            <input
              id="name"
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
              disabled={submitting}
              placeholder="your.email@example.com"
              className={authInputClassName}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="block text-sm font-medium text-brand-dark">
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
              disabled={submitting}
              placeholder="At least 8 characters"
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
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-brand-dark/60">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-brand-dark hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
