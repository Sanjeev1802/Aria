import { Suspense } from "react"
import { AuthShell } from "@/components/auth-shell"
import { ForgotPasswordForm } from "@/components/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <p className="si text-[14px] text-[var(--bn-ink-3)]">Loading…</p>
        }
      >
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
