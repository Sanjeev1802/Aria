"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { sendPasswordResetEmail } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import { ArrowLeftIcon, CheckCircle2Icon } from "lucide-react"

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim())
      setSent(true)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not send reset email"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <div className="mb-8">
        <p className="bn-eyebrow mb-2">Account recovery</p>
        <h2 className="bn-title text-[28px]">
          Forgot your{" "}
          <span className="si text-[var(--bn-acc)]">password</span>?
        </h2>
        <p className="si mt-2 text-[14px] text-[var(--bn-ink-3)]">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      {sent ? (
        <div className="bn-card p-5">
          <div className="mb-3 flex items-center gap-2 text-[var(--bn-success)]">
            <CheckCircle2Icon className="size-5" />
            <p className="text-[14px] font-medium">Check your inbox</p>
          </div>
          <p className="si text-[14px] leading-relaxed text-[var(--bn-ink-2)]">
            If an account exists for{" "}
            <span className="text-[var(--bn-ink)]">{email}</span>, a password
            reset link has been sent. Follow the email to choose a new password.
          </p>
          <Link
            href="/login"
            className="ask-submit mt-5 inline-flex h-11 w-full no-underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.4px] text-[var(--bn-ink-3)]">
              Email
            </span>
            <input
              id="reset-email"
              type="email"
              placeholder="you@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <Link
        href="/login"
        className="si mt-6 inline-flex items-center justify-center gap-1.5 text-[13px] text-[var(--bn-ink-3)] no-underline transition-colors hover:text-[var(--bn-acc)]"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to sign in
      </Link>
    </div>
  )
}
