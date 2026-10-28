"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AriaMark } from "@/components/aria-mark"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FieldDescription, FieldGroup } from "@/components/ui/field"
import { acceptAriaInvite } from "@/lib/aria-team-api"
import { ARIA_IS_PREVIEW, refreshAriaSession, useAriaSession } from "@/lib/aria-session"
import { useClientValue } from "@/hooks/use-client-value"

const tokenFromQuery = () => new URLSearchParams(window.location.search).get("token") ?? ""

export function InviteAcceptCard() {
  const router = useRouter()
  const session = useAriaSession()
  const token = useClientValue(tokenFromQuery, "")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    void refreshAriaSession()
  }, [])

  const signInHref = `/sign-in/?next=${encodeURIComponent(`/invite/?token=${token}`)}`

  async function accept() {
    setPending(true)
    setError(null)
    try {
      await acceptAriaInvite(token)
      await refreshAriaSession()
      router.push("/chat/")
    } catch (e) {
      setError((e as Error).message)
      setPending(false)
    }
  }

  let body: React.ReactNode
  if (ARIA_IS_PREVIEW) body = <p className="text-muted-foreground">Invitations need the live ARIA service.</p>
  else if (!token) body = <p className="text-muted-foreground">This invitation link is incomplete.</p>
  else if (session.status === "loading") body = <p className="text-muted-foreground">Checking your session…</p>
  else if (session.status === "unauthenticated") {
    body = (
      <>
        <p className="text-muted-foreground">Sign in with the email address this invitation was sent to.</p>
        <Button asChild><Link href={signInHref}>Sign in to accept</Link></Button>
      </>
    )
  } else if (session.status === "unavailable") body = <p className="text-muted-foreground">ARIA is not available right now. Try again shortly.</p>
  else {
    body = (
      <>
        <p className="text-muted-foreground">Signed in as {session.user?.email}.</p>
        <Button type="button" disabled={pending} onClick={() => void accept()}>
          {pending ? "Joining…" : "Join workspace"}
        </Button>
        {error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}
      </>
    )
  }

  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="p-6 md:p-8">
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/" className="mb-1 flex items-center gap-2 font-semibold" aria-label="ARIA home">
              <AriaMark className="aria-auth-mobile-mark" />
              ARIA
            </Link>
            <h1 className="text-2xl font-bold">Join a team workspace</h1>
          </div>
          <div className="flex flex-col items-center gap-4 text-center">{body}</div>
          <FieldDescription className="text-center">
            Members share the workspace credit pool. An admin can remove access at any time.
          </FieldDescription>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
