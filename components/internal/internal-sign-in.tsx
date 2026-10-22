"use client"

import Link from "next/link"
import { useRef, useState, type FormEvent } from "react"
import { AriaMark } from "@/components/aria-mark"
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel"
import { AuthPageFrame } from "@/components/auth/auth-page-frame"
import { PasswordInput } from "@/components/auth/password-input"
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
import { ARIA_IS_PREVIEW, ariaSignIn } from "@/lib/aria-session"

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function InternalSignIn() {
  const emailWrapRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [errorText, setErrorText] = useState("")

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    if (!isValidEmail(email) || password.trim().length < 1) {
      setErrorText("Enter a valid email and password.")
      showInputError(emailWrapRef.current)
      return
    }
    if (ARIA_IS_PREVIEW) {
      setErrorText("Operator sign-in requires a running ARIA server with real authentication.")
      showInputError(emailWrapRef.current)
      return
    }
    setErrorText("")
    setPending(true)
    try {
      const result = await ariaSignIn(email.trim(), password)
      if (!result.ok) {
        setErrorText(result.message)
        showInputError(emailWrapRef.current)
        return
      }
      const access = await fetch("/api/admin/overview/", {
        credentials: "same-origin",
        cache: "no-store",
      })
      if (!access.ok) {
        const body = await access.json().catch(() => ({}))
        setErrorText(
          access.status === 403
            ? "This account is signed in but is not authorized for ARIA Internal."
            : body.message || "Internal access could not be verified. Try again.",
        )
        showInputError(emailWrapRef.current)
        return
      }
      window.location.assign("/internal/")
    } catch {
      setErrorText("Could not reach ARIA. Check your connection and try again.")
      showInputError(emailWrapRef.current)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthPageFrame>
      <div className="flex flex-col gap-6">
        <Card className="overflow-hidden border-border/50 bg-transparent p-0 shadow-2xl">
          <CardContent className="grid p-0 md:grid-cols-2">
            <AuthBrandPanel />
            <form className="bg-card p-6 md:p-8" onSubmit={onSubmit} noValidate>
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <Link
                    href="/"
                    className="mb-1 flex items-center gap-2 font-semibold md:hidden"
                    aria-label="ARIA home"
                  >
                    <AriaMark className="aria-auth-mobile-mark" />
                    ARIA
                  </Link>
                  <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                    ARIA / INTERNAL ACCESS
                  </p>
                  <h1 className="text-2xl font-bold">Operator sign in</h1>
                  <p className="text-balance text-muted-foreground">
                    Use your authorized ARIA account to enter the console.
                  </p>
                </div>
                <Field>
                  <div ref={emailWrapRef} className="t-input-wrap space-y-2">
                    <FieldLabel htmlFor="internal-email">Work email</FieldLabel>
                    <Input
                      id="internal-email"
                      type="email"
                      autoComplete="username"
                      inputMode="email"
                      className="t-input"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        clearInputError(emailWrapRef.current)
                        if (errorText) setErrorText("")
                      }}
                      required
                    />
                    {errorText ? (
                      <p className="t-error-msg text-destructive text-sm" role="alert">
                        {errorText}
                      </p>
                    ) : null}
                  </div>
                </Field>
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="internal-password">Password</FieldLabel>
                    <Link
                      href="/forgot-password/"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <PasswordInput
                    id="internal-password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={pending}>
                    {pending ? "Verifying access…" : "Enter console"}
                  </Button>
                </Field>
                <FieldDescription className="text-center">
                  <Link href="/chat/">Return to ARIA workspace</Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <FieldDescription className="px-6 text-center text-white/80">
          Access is verified on every request. All changes are recorded.
        </FieldDescription>
      </div>
    </AuthPageFrame>
  )
}
