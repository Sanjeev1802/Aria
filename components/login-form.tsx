"use client"

import Link from "next/link"
import { useRef, useState, type ComponentProps, type FormEvent } from "react"
import { AuthFormShell, AuthLegalFooter } from "@/components/auth/auth-form-shell"
import { WorkspaceBootstrapOverlay } from "@/components/auth/workspace-bootstrap-overlay"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/auth/password-input"
import { clearInputError, showInputError } from "@/lib/show-input-error"
import { safeNextPath } from "@/lib/auth/safe-next-path"
import { useClientValue } from "@/hooks/use-client-value"
import { ARIA_IS_PREVIEW, ariaSignIn, refreshAriaSession } from "@/lib/aria-session"
import { cn } from "cn"

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

const DEFAULT_ERROR = "Enter a valid email and password."

function destinationFromQuery() {
  if (typeof window === "undefined") return "/chat/"
  return safeNextPath(new URLSearchParams(window.location.search).get("next"))
}

export function LoginForm({ className, ...props }: ComponentProps<"div">) {
  const emailWrapRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [bootstrap, setBootstrap] = useState(false)
  const [pending, setPending] = useState(false)
  const [errorText, setErrorText] = useState("")
  const nextPath = useClientValue(destinationFromQuery, "/chat/")

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isValidEmail(email) || password.trim().length < 1) {
      setErrorText(DEFAULT_ERROR)
      showInputError(emailWrapRef.current)
      return
    }
    if (ARIA_IS_PREVIEW) {
      setBootstrap(true)
      return
    }
    setPending(true)
    const result = await ariaSignIn(email, password)
    setPending(false)
    if (!result.ok) {
      setErrorText(result.message)
      showInputError(emailWrapRef.current)
      return
    }
    void refreshAriaSession({ force: true })
    setBootstrap(true)
  }

  if (bootstrap) {
    return <WorkspaceBootstrapOverlay intent="sign-in" destination={nextPath} />
  }

  return (
    <div className={cn(className)} {...props}>
      <AuthFormShell
        variant="sign-in"
        title="Welcome back"
        subtitle="Sign in to your ARIA workspace."
        footer={<AuthLegalFooter />}
      >
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup className="gap-4">
            <Field className="gap-1.5">
              <div ref={emailWrapRef} className="t-input-wrap aria-auth-field-stack">
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="t-input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearInputError(emailWrapRef.current)
                    if (errorText) setErrorText("")
                  }}
                  required
                />
                <p className="t-error-msg aria-auth-field-error text-destructive" role="alert">{errorText}</p>
              </div>
            </Field>
            <Field className="gap-1.5">
              <div className="aria-auth-field-stack">
                <div className="flex items-center gap-2">
                  <FieldLabel htmlFor="password" className="mb-0">Password</FieldLabel>
                  {ARIA_IS_PREVIEW ? (
                    <span className="ml-auto text-sm text-muted-foreground">Preview only</span>
                  ) : (
                    <Link href="/forgot-password/" className="ml-auto text-sm underline-offset-4 hover:underline">
                      Forgot password?
                    </Link>
                  )}
                </div>
                <PasswordInput
                  id="password"
                  className="t-input"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </Field>
            <Field>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </Field>
            <FieldDescription className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href={`/sign-up/?next=${encodeURIComponent(nextPath)}`}>Sign up</Link>
            </FieldDescription>
          </FieldGroup>
        </form>
      </AuthFormShell>
    </div>
  )
}
