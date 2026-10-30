"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ComponentProps, type FormEvent } from "react"
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
import { meetsPasswordPolicy, PASSWORD_HINT } from "@/lib/auth/password-policy"
import { safeNextPath } from "@/lib/auth/safe-next-path"
import { useClientValue } from "@/hooks/use-client-value"
import { ARIA_IS_PREVIEW, ariaConfirmSignUp, ariaResendCode, ariaSignIn, ariaSignUp } from "@/lib/aria-session"
import { cn } from "cn"

const DEFAULT_ERROR = `Use a valid email, matching passwords, and ${PASSWORD_HINT.toLowerCase()}`

function destinationFromQuery() {
  if (typeof window === "undefined") return "/chat/"
  return safeNextPath(new URLSearchParams(window.location.search).get("next"))
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function SignupForm({ className, ...props }: ComponentProps<"div">) {
  const emailWrapRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [bootstrap, setBootstrap] = useState(false)
  const [pending, setPending] = useState(false)
  const [errorText, setErrorText] = useState("")
  const [awaitingCode, setAwaitingCode] = useState(false)
  const [code, setCode] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const nextPath = useClientValue(destinationFromQuery, "/chat/")

  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get("email")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (preset) setEmail(preset)
  }, [])

  function fail(message: string) {
    setErrorText(message)
    showInputError(emailWrapRef.current)
  }

  async function finishSignIn() {
    const result = await ariaSignIn(email, password)
    if (!result.ok) return fail(result.message)
    setBootstrap(true)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (awaitingCode) {
      if (!/^\d{4,10}$/.test(code.trim())) return fail("Enter the code from your confirmation email.")
      setPending(true)
      const confirmed = await ariaConfirmSignUp(email, code.trim())
      if (!confirmed.ok) { setPending(false); return fail(confirmed.message) }
      await finishSignIn()
      setPending(false)
      return
    }
    const valid =
      isValidEmail(email) && meetsPasswordPolicy(password) && password === confirmPassword
    if (!valid) {
      fail(DEFAULT_ERROR)
      return
    }
    if (ARIA_IS_PREVIEW) {
      setBootstrap(true)
      return
    }
    setPending(true)
    const result = await ariaSignUp(email, password)
    if (!result.ok) { setPending(false); return fail(result.message) }
    if (result.confirmationRequired) {
      setPending(false)
      setAwaitingCode(true)
      setNotice(`We sent a confirmation code to ${email.trim()}.`)
      return
    }
    await finishSignIn()
    setPending(false)
  }

  async function onResend() {
    setPending(true)
    const result = await ariaResendCode(email)
    setPending(false)
    setNotice(result.ok ? "A new code is on its way." : result.message)
    if (!result.ok) showInputError(emailWrapRef.current)
  }

  if (bootstrap) {
    return <WorkspaceBootstrapOverlay intent="sign-up" destination={nextPath} />
  }

  return (
    <div className={cn(className)} {...props}>
      <AuthFormShell
        variant="sign-up"
        title="Create your account"
        subtitle={
          awaitingCode
            ? "Enter the confirmation code we emailed you."
            : "Set up your workspace with a work email and a secure password."
        }
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
                  readOnly={awaitingCode}
                />
                <p className="t-error-msg aria-auth-field-error text-destructive" role="alert">
                  {errorText}
                </p>
              </div>
              <FieldDescription className="text-sm">
                {notice ?? "We\u2019ll use this to contact you. We will not share your email with anyone else."}
              </FieldDescription>
            </Field>
            {awaitingCode ? (
              <Field>
                <FieldLabel htmlFor="confirmation-code">Confirmation code</FieldLabel>
                <Input
                  id="confirmation-code"
                  className="t-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    clearInputError(emailWrapRef.current)
                  }}
                  required
                />
                <FieldDescription>
                  Didn&apos;t get it?{" "}
                  <button type="button" className="underline underline-offset-4" disabled={pending} onClick={() => void onResend()}>
                    {pending ? "Sending…" : "Resend code"}
                  </button>
                </FieldDescription>
              </Field>
            ) : (
              <Field className="gap-2">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="aria-auth-field-stack">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <PasswordInput
                      id="password"
                      className="t-input"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="aria-auth-field-stack">
                    <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
                    <PasswordInput
                      id="confirm-password"
                      className="t-input"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <FieldDescription className="text-sm">{PASSWORD_HINT}</FieldDescription>
              </Field>
            )}
            <Field>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Please wait…" : awaitingCode ? "Confirm and continue" : "Create account"}
              </Button>
            </Field>
            <FieldDescription className="text-center text-sm">
              Already have an account?{" "}
              <Link href={`/sign-in/?next=${encodeURIComponent(nextPath)}`}>Sign in</Link>
            </FieldDescription>
          </FieldGroup>
        </form>
      </AuthFormShell>
    </div>
  )
}
