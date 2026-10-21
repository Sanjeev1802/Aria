"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ShaderBackground } from "@/components/ui/kim"
import { useMediaQuery } from "@/hooks/use-media-query"

export function AuthPageFrame({
  children,
  maxWidthClass = "md:max-w-4xl",
}: {
  children: ReactNode
  maxWidthClass?: string
}) {
  const [mounted, setMounted] = useState(false)
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)")

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="dark relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-6 text-foreground scheme-dark md:p-10">
      {mounted && !reduceMotion ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <ShaderBackground className="h-full w-full" />
        </div>
      ) : null}
      <div className={`relative z-10 w-full max-w-sm ${maxWidthClass}`}>{children}</div>
    </div>
  )
}
