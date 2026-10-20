import type { Metadata } from "next"
import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: "Sign in — ARIA",
  description: "Sign in to your ARIA workspace (product preview).",
}

export default function SignInPage() {
  return (
    <div className="dark flex min-h-svh flex-col items-center justify-center bg-background p-6 text-foreground scheme-dark md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  )
}
