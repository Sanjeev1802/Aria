"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@aria/auth";
import { webUrl } from "@aria/config";
import { FloatingPaths } from "@/components/floating-paths";
import { AriaLogo } from "@/components/AriaLogo";
import { AtSignIcon, ChevronLeftIcon, LockIcon } from "lucide-react";

const inputClassName =
  "box-border block h-11 w-full min-w-0 rounded-lg border border-brand-dark/15 bg-white/60 px-3 pl-10 text-sm text-brand-dark outline-none transition-colors placeholder:text-brand-dark/40 focus:border-primary/60 focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

function authErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Email or password is incorrect.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      default:
        return error.message;
    }
  }
  if (error instanceof Error) return error.message;
  return "Unable to sign in. Please try again.";
}

export default function SignInPage() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background lg:grid lg:grid-cols-2">
      <aside className="relative hidden min-h-dvh overflow-hidden border-r border-border bg-brand-dark lg:flex lg:flex-col lg:p-10">
        <Link
          href={webUrl}
          className="relative z-10 inline-flex items-center gap-2.5 text-brand-cream"
        >
          <AriaLogo className="h-6 w-auto" />
          <span className="text-[13px] font-semibold tracking-[0.18em]">
            BNII ARIA
          </span>
        </Link>
        <div className="relative z-10 mt-auto max-w-md pb-4">
          <blockquote className="flex flex-col gap-3">
            <p className="font-serif text-xl leading-relaxed text-brand-cream">
              &ldquo;ARIA transformed how our team turns enterprise data into
              decisions — every answer grounded in real business context.&rdquo;
            </p>
            <footer className="text-sm font-medium text-brand-cream/55">
              Enterprise analytics team
            </footer>
          </blockquote>
        </div>
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </aside>

      <section className="relative flex min-h-dvh min-w-0 flex-col bg-brand-cream text-brand-dark">
        <Link
          href={webUrl}
          className="absolute top-[max(1.5rem,env(safe-area-inset-top))] left-[max(1.25rem,env(safe-area-inset-left))] z-10 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-brand-dark/60 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark sm:top-8 sm:left-8"
        >
          <ChevronLeftIcon className="size-4" />
          Home
        </Link>

        <div className="flex flex-1 items-center justify-center px-5 py-24 sm:px-10">
          <div className="w-full min-w-0 max-w-[360px]">
            <div className="mb-8">
              <h1 className="font-sans text-2xl font-semibold tracking-tight text-brand-dark">
                Sign in
              </h1>
              <p className="mt-2 font-serif text-sm leading-relaxed text-brand-dark/65 sm:text-base">
                Enter your email and password to access your ARIA workspace.
              </p>
            </div>

            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-brand-dark"
                >
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
                    className={inputClassName}
                  />
                </div>
              </div>

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
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting || loading}
                    placeholder="Enter your password"
                    className={inputClassName}
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
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
