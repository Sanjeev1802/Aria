import { BniiAriaLogo } from "@/components/auth/bnii-aria-logo"

export type AuthMarketingVariant = "sign-in" | "sign-up"

export function AuthBrandLockup({ size = "large" }: { size?: "default" | "large" }) {
  return (
    <div className="aria-auth-brand-lockup">
      <BniiAriaLogo size={size} />
      <p className="aria-auth-brand-lockup__tagline">Intelligence workspace</p>
    </div>
  )
}

export function AuthBrandPanel(_props?: { variant?: AuthMarketingVariant }) {
  return (
    <aside className="aria-auth-marketing" aria-label="BNII ARIA">
      <div className="aria-auth-marketing__inner">
        <AuthBrandLockup size="large" />
      </div>
    </aside>
  )
}
