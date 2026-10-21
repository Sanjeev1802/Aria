"use client"

import Link from "next/link"
import { useRef, useState, type ComponentProps, type FormEvent } from "react"
import { AriaMark } from "@/components/aria-mark"
import { WorkspaceBootstrapOverlay } from "@/components/auth/workspace-bootstrap-overlay"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { clearInputError, showInputError } from "@/lib/show-input-error"
import { ARIA_IS_PREVIEW, ariaConfirmSignUp, ariaResendCode, ariaSignIn, ariaSignUp } from "@/lib/aria-session"
import { cn } from "cn"

const DEFAULT_ERROR = "Use a valid email and matching passwords of at least 8 characters."

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function AuthBrandPanel() {
  return (
    <div className="relative hidden min-h-[28rem] items-center justify-center overflow-hidden md:flex">
      <Link href="/" aria-label="ARIA home" className="relative z-10 flex flex-col items-center gap-4 text-white">
        <AriaMark className="aria-auth-panel-mark" />
        <span className="text-lg font-semibold tracking-[0.22em]">ARIA</span>
      </Link>
    </div>
  )
}

export function SignupForm({ className, ...props }: ComponentProps<"div">) {
  const emailWrapRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [bootstrap, setBootstrap] = useState(false)
  const [pending, setPending] = useState(false)
  const [errorText, setErrorText] = useState(DEFAULT_ERROR)
  const [awaitingCode, setAwaitingCode] = useState(false)
  const [code, setCode] = useState("")
  const [notice, setNotice] = useState<string | null>(null)

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
      isValidEmail(email) && password.trim().length >= 8 && password === confirmPassword
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
    return <WorkspaceBootstrapOverlay intent="sign-up" />
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden border-border/50 bg-transparent p-0 shadow-2xl">
        <CardContent className="grid p-0 md:grid-cols-2">
          <AuthBrandPanel />
          <form className="bg-card p-6 md:p-8" onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <Link href="/" className="mb-1 flex items-center gap-2 font-semibold md:hidden" aria-label="ARIA home">
                  <AriaMark className="aria-auth-mobile-mark" />
                  ARIA
                </Link>
                <h1 className="text-2xl font-bold">Create your account</h1>
                <p className="text-sm text-balance text-muted-foreground">
                  Enter your email below to create your account
                </p>
              </div>
              <Field>
                <div ref={emailWrapRef} className="t-input-wrap space-y-2">
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="t-input"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      clearInputError(emailWrapRef.current)
                    }}
                    required
                  />
                  <p className="t-error-msg text-destructive text-sm" role="alert">
                    {errorText}
                  </p>
                </div>
                <FieldDescription>
                  {notice ?? "We\u2019ll use this to contact you. We will not share your email with anyone else."}
                </FieldDescription>
              </Field>
              {awaitingCode ? (
                <Field>
                  <FieldLabel htmlFor="confirmation-code">Confirmation code</FieldLabel>
                  <Input
                    id="confirmation-code"
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
              <Field>
                <Field className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </Field>
                </Field>
                <FieldDescription>Must be at least 8 characters long.</FieldDescription>
              </Field>
              )}
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? "Please wait…" : awaitingCode ? "Confirm and continue" : "Create Account"}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Already have an account? <Link href="/sign-in/">Sign in</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center text-white/80">
        {ARIA_IS_PREVIEW ? "Preview only — no account is stored. " : ""}By continuing, you agree to our{" "}
        <Link href="/terms/" className="underline underline-offset-4 hover:text-white">Terms of Service</Link>
        {" "}and{" "}
        <Link href="/privacy/" className="underline underline-offset-4 hover:text-white">Privacy Policy</Link>.
      </FieldDescription>
    </div>
  )
}
