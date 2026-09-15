"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authErrorMessage } from "@/lib/auth";
import { confirmForgotPassword, forgotPassword } from "@/lib/auth/cognito-client";
import { AuthShell, authInputClassName } from "@/components/auth/AuthShell";
import { AtSignIcon, KeyRoundIcon, LockIcon } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setStep("reset");
    } catch (err) {
      setError(authErrorMessage(err, "Unable to send a reset code."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await confirmForgotPassword({ email, code, password });
      router.replace("/sign-in");
    } catch (err) {
      setError(authErrorMessage(err, "Unable to reset the password."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={step === "request" ? "Forgot password" : "Choose a new password"}
      description={
        step === "request"
          ? "We’ll email you a code to reset your password."
          : "Enter the code from your email and a new password."
      }
    >
      {step === "request" ? (
        <form className="flex flex-col gap-5" onSubmit={handleRequest}>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="block text-sm font-medium text-brand-dark">
              Email
            </label>
            <div className="relative">
              <AtSignIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-dark/40" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={authInputClassName}
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send reset code"}
          </button>
        </form>
      ) : (
        <form className="flex flex-col gap-5" onSubmit={handleReset}>
          <div className="flex flex-col gap-2">
            <label htmlFor="code" className="block text-sm font-medium text-brand-dark">
              Reset code
            </label>
            <div className="relative">
              <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-dark/40" />
              <input
                id="code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={authInputClassName}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="block text-sm font-medium text-brand-dark">
              New password
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
                className={authInputClassName}
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-brand-dark/60">
        <Link href="/sign-in" className="font-medium text-brand-dark hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
