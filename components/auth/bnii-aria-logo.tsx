import Link from "next/link"
import { cn } from "@/lib/utils"

type BniiAriaLogoProps = {
  className?: string
  size?: "default" | "large"
  href?: string
}

/** Text-only BNII ARIA lockup (no legacy mark). */
export function BniiAriaLogo({ className, size = "default", href = "/" }: BniiAriaLogoProps) {
  const body = (
    <span className={cn("aria-bnii-logo", size === "large" && "aria-bnii-logo--large", className)}>
      BNII ARIA
    </span>
  )

  if (!href) return body
  return (
    <Link href={href} className="aria-bnii-logo__link" aria-label="BNII ARIA home">
      {body}
    </Link>
  )
}
