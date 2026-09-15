"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authErrorMessage } from "@/lib/auth";
import { confirmSignUp, resendConfirmationCode } from "@/lib/auth/cognito-client";
import { AuthShell, authInputClassName } from "@/components/auth/AuthShell";
import { KeyRoundIcon } from "lucide-react";

function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(presetEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await confirmSignUp(email, code);
      router.replace("/sign-in");
    } catch (err) {
      setError(authErrorMessage(err, "Unable to confirm this account."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    try {
      await resendConfirmationCode(email);
      setInfo("A new code is on its way.");
    } catch (err) {
      setError(authErrorMessage(err, "Unable to resend the code."));
    }
  }

  return (
    <AuthShell
      title="Confirm your email"
      description="Enter the verification code we sent to your inbox."
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="block text-sm font-medium text-brand-dark">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${authInputClassName} pl-3`}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="code" className="block text-sm font-medium text-brand-dark">
            Confirmation code
          </label>
          <div className="relative">
            <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-dark/40" />
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className={authInputClassName}
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="rounded-lg border border-foreground/10 bg-white/70 px-3 py-2 text-sm text-brand-dark/70">
            {info}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Confirming…" : "Confirm email"}
        </button>
        <button
          type="button"
          onClick={() => void handleResend()}
          className="text-sm text-brand-dark/60 hover:text-brand-dark"
        >
          Resend code
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-brand-dark/60">
        <Link href="/sign-in" className="font-medium text-brand-dark hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-foreground/60">
          Loading…
        </div>
      }
    >
      <ConfirmForm />
    </Suspense>
  );
}
