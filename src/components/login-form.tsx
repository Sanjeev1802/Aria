"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase"
import { cn } from "@/lib/utils"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
      router.push("/chat")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const forgotHref = email.trim()
    ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
    : "/forgot-password"

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <div className="mb-8">
        <p className="bn-eyebrow mb-2">Sign in</p>
        <h2 className="bn-title text-[28px]">
          Welcome to <span className="si text-[var(--bn-acc)]">BNII ARIA</span>
        </h2>
        <p className="si mt-2 text-[14px] text-[var(--bn-ink-3)]">
          Enter your credentials to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.4px] text-[var(--bn-ink-3)]">
            Email
          </span>
          <input
            id="email"
            type="email"
            placeholder="you@company.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-[12px] border-[0.5px] border-[rgba(13,11,7,0.14)] bg-[var(--bn-bg)] px-3.5 text-[13.5px] text-[var(--bn-ink)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--bn-ink-3)] focus:border-[var(--bn-acc)] focus:shadow-[0_0_0_3px_rgba(139,107,61,0.1)]"
          />
        </label>

        <label className="block">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="text-[12px] font-medium uppercase tracking-[0.4px] text-[var(--bn-ink-3)]">
              Password
            </span>
            <Link
              href={forgotHref}
              className="si text-[12px] text-[var(--bn-acc)] no-underline transition-colors hover:text-[var(--bn-acc-deep)]"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-[12px] border-[0.5px] border-[rgba(13,11,7,0.14)] bg-[var(--bn-bg)] px-3.5 text-[13.5px] text-[var(--bn-ink)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--bn-ink-3)] focus:border-[var(--bn-acc)] focus:shadow-[0_0_0_3px_rgba(139,107,61,0.1)]"
          />
        </label>

        {error && (
          <p className="text-[13px] text-[var(--bn-error)]">{error}</p>
        )}

        <button
          type="submit"
          className="ask-submit mt-2 h-12 w-full"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 space-y-3 text-center">
        <p className="text-[13px] text-[var(--bn-ink-2)]">
          Need help accessing your account?{" "}
          <Link
            href={forgotHref}
            className="text-[var(--bn-acc)] no-underline transition-colors hover:text-[var(--bn-acc-deep)]"
          >
            Reset password
          </Link>
        </p>
        <p className="si text-[12px] text-[var(--bn-ink-3)]">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
