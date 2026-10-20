import type { Metadata } from "next"
import { SignupForm } from "@/components/signup-form"

export const metadata: Metadata = {
  title: "Create account — ARIA",
  description: "Create your ARIA workspace (product preview).",
}

export default function SignUpPage() {
  return (
    <div className="dark flex min-h-svh flex-col items-center justify-center bg-background p-6 text-foreground scheme-dark md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <SignupForm />
      </div>
    </div>
  )
}
