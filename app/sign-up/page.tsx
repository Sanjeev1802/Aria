import type { Metadata } from "next"
import { AuthPageFrame } from "@/components/auth/auth-page-frame"
import { SignupForm } from "@/components/signup-form"

export const metadata: Metadata = {
  title: "Create account — ARIA",
  description: "Create your ARIA workspace (product preview).",
}

export default function SignUpPage() {
  return (
    <AuthPageFrame>
      <SignupForm />
    </AuthPageFrame>
  )
}
