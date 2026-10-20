import type { Metadata } from "next"
import { InviteAcceptCard } from "@/components/auth/invite-accept-card"

export const metadata: Metadata = {
  title: "Join workspace — ARIA",
  description: "Accept an invitation to an ARIA Team workspace.",
  robots: { index: false },
}

export default function InvitePage() {
  return (
    <div className="dark flex min-h-svh flex-col items-center justify-center bg-background p-6 text-foreground scheme-dark md:p-10">
      <div className="w-full max-w-sm">
        <InviteAcceptCard />
      </div>
    </div>
  )
}
