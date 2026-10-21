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
import { ARIA_IS_PREVIEW, ariaSignIn } from "@/lib/aria-session"
import { cn } from "cn"

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

const DEFAULT_ERROR = "Enter a valid email and password."

/** Same-origin path from `?next=`, never an external URL. */
function safeNextPath() {
  if (typeof window === "undefined") return "/chat/"
  const next = new URLSearchParams(window.location.search).get("next") ?? ""
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/chat/"
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

export function LoginForm({ className, ...props }: ComponentProps<"div">) {
  const emailWrapRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [bootstrap, setBootstrap] = useState(false)
  const [pending, setPending] = useState(false)
  const [errorText, setErrorText] = useState(DEFAULT_ERROR)

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
    setBootstrap(true)
  }

  if (bootstrap) {
    return <WorkspaceBootstrapOverlay intent="sign-in" destination={safeNextPath()} />
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
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Sign in to your ARIA workspace
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
                  <p className="t-error-msg text-destructive text-sm" role="alert">{errorText}</p>
                </div>
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  {ARIA_IS_PREVIEW ? (
                    <span className="ml-auto text-sm text-muted-foreground">Preview only</span>
                  ) : (
                    <Link href="/forgot-password/" className="ml-auto text-sm underline-offset-4 hover:underline">
                      Forgot password?
                    </Link>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Login"}</Button>
              </Field>
              <FieldDescription className="text-center">
                Don&apos;t have an account? <Link href="/sign-up/">Sign up</Link>
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
