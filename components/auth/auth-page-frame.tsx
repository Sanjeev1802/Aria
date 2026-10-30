import { type ReactNode } from "react"

/** Full-height auth canvas for sign-in and sign-up split layouts. */
export function AuthPageFrame({
  children,
  maxWidthClass: _maxWidthClass,
}: {
  children: ReactNode
  /** @deprecated Split auth pages are full viewport; ignored when set. */
  maxWidthClass?: string
}) {
  return (
    <div className="aria-auth-frame dark min-h-svh text-foreground scheme-dark">
      {children}
    </div>
  )
}
