"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { FloatingPaths } from "@/components/auth/floating-paths";
import { useAuth } from "@/components/auth/auth-provider";
import { AtSignIcon, ChevronLeftIcon, LockIcon } from "lucide-react";

const inputClassName =
  "box-border block h-11 w-full min-w-0 rounded-lg border border-foreground/15 bg-background px-3 pl-10 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/45 focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10 disabled:opacity-60";

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

export function AuthPage() {
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
    <main className="min-h-dvh lg:grid lg:grid-cols-2">
      <aside className="relative hidden min-h-dvh overflow-hidden border-r border-foreground/10 bg-background lg:flex lg:flex-col lg:p-10">
        <Link
          href="/"
          className="relative z-10 text-lg font-semibold tracking-tight"
        >
          BNII ARIA
        </Link>

        <div className="relative z-10 mt-auto max-w-md pb-4">
          <blockquote className="flex flex-col gap-3">
            <p className="font-serif text-xl leading-relaxed">
              &ldquo;ARIA transformed how our team turns enterprise data into
              decisions — every answer grounded in real business context.&rdquo;
            </p>
            <footer className="text-sm font-medium text-foreground/55">
              Enterprise analytics team
            </footer>
          </blockquote>
        </div>

        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </aside>

      <section className="relative flex min-h-dvh min-w-0 flex-col bg-background">
        <Link
          href="/"
          className="absolute top-[max(1.5rem,env(safe-area-inset-top))] left-[max(1.25rem,env(safe-area-inset-left))] z-10 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground sm:top-8 sm:left-8"
        >
          <ChevronLeftIcon className="size-4" />
          Home
        </Link>

        <div className="flex flex-1 items-center justify-center px-5 py-24 sm:px-10">
          <div className="w-full min-w-0 max-w-[360px]">
            <Link
              href="/"
              className="mb-8 inline-block text-lg font-semibold tracking-tight lg:hidden"
            >
              BNII ARIA
            </Link>

            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
              <p className="mt-2 text-sm leading-relaxed text-foreground/65 sm:text-base">
                Enter your email and password to access your ARIA workspace.
              </p>
            </div>

            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium leading-none"
                >
                  Email
                </label>
                <div className="relative">
                  <AtSignIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/45" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="your.email@example.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={submitting || loading}
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium leading-none"
                >
                  Password
                </label>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/45" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={submitting || loading}
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
                className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-8 text-sm leading-relaxed text-foreground/60">
              By signing in, you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-4">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-4">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
