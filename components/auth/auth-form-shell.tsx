"use client"

import { type ReactNode } from "react"
import { AuthBrandLockup, AuthBrandPanel, type AuthMarketingVariant } from "@/components/auth/auth-brand-panel"
import { FieldDescription } from "@/components/ui/field"
import { ARIA_IS_PREVIEW } from "@/lib/aria-session"
import Link from "next/link"

type AuthFormShellProps = {
  variant: AuthMarketingVariant
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

/** Full-viewport split: BNII ARIA story on the left, form on the right. */
export function AuthFormShell({ variant, title, subtitle, children, footer }: AuthFormShellProps) {
  return (
    <div className="aria-auth-split">
      <AuthBrandPanel variant={variant} />
      <div className="aria-auth-form-panel">
        <div className="aria-auth-form-panel__inner">
          <div className="aria-auth-form-panel__mobile-brand md:hidden">
            <AuthBrandLockup size="default" />
          </div>
          <header className="aria-auth-form-panel__header">
            <h1 className="aria-auth-form-panel__title">{title}</h1>
            <p className="aria-auth-form-panel__subtitle">{subtitle}</p>
          </header>
          {children}
          <FieldDescription className="aria-auth-form-panel__legal">{footer}</FieldDescription>
        </div>
      </div>
    </div>
  )
}

export function AuthLegalFooter() {
  return (
    <>
      {ARIA_IS_PREVIEW ? "Preview only — no account is stored. " : ""}
      By continuing, you agree to our{" "}
      <Link href="/terms/" className="underline underline-offset-4 hover:text-foreground">
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link href="/privacy/" className="underline underline-offset-4 hover:text-foreground">
        Privacy Policy
      </Link>
      .
    </>
  )
}
