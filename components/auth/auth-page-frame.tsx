import { type ReactNode } from "react"

/** Plain dark page behind the sign-in, sign-up and password cards. */
export function AuthPageFrame({
  children,
  maxWidthClass = "md:max-w-4xl",
}: {
  children: ReactNode
  maxWidthClass?: string
}) {
  return (
    <div className="dark relative flex min-h-svh flex-col items-center justify-center bg-background p-6 text-foreground scheme-dark md:p-10">
      <div className={`relative z-10 w-full max-w-sm ${maxWidthClass}`}>{children}</div>
    </div>
  )
}
