import Link from "next/link"
import { AriaMark } from "@/components/aria-mark"

export function AuthBrandPanel() {
  return (
    <div className="relative hidden min-h-[28rem] items-center justify-center overflow-hidden md:flex">
      <Link href="/" aria-label="ARIA home" className="relative z-10 flex flex-col items-center gap-4 text-white">
        <AriaMark className="aria-auth-panel-mark" />
        <span className="text-lg font-semibold tracking-[0.22em]">ARIA</span>
      </Link>
    </div>
  )
}
