import type { Metadata } from "next"
import { AuthPageFrame } from "@/components/auth/auth-page-frame"
import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: "Sign in — ARIA",
  description: "Sign in to your ARIA workspace (product preview).",
}

export default function SignInPage() {
  return (
    <AuthPageFrame>
      <LoginForm />
    </AuthPageFrame>
  )
}
