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
  FieldSeparator,
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
    <div className="relative hidden items-center justify-center bg-muted md:flex">
      <Link href="/" aria-label="ARIA home" className="flex flex-col items-center gap-4 text-foreground">
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
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <AuthBrandPanel />
          <form className="p-6 md:p-8" onSubmit={onSubmit} noValidate>
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
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>
              <Field className="grid grid-cols-2 gap-4">
                <Button variant="outline" type="button" disabled title="Not available in preview">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden>
                    <path
                      d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">Login with Apple</span>
                </Button>
                <Button variant="outline" type="button" disabled title="Not available in preview">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden>
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">Login with Google</span>
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Don&apos;t have an account? <Link href="/sign-up/">Sign up</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        {ARIA_IS_PREVIEW ? "Preview only — no account is stored. " : ""}By continuing, you agree to our Terms of Service and Privacy Policy.
      </FieldDescription>
    </div>
  )
}
