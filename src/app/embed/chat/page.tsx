import { ChatPanel } from "@/components/chat-panel"
import { verifyEmbedToken } from "@/lib/embed-session"

export const dynamic = "force-dynamic"

export default async function EmbedChatPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const session = token ? verifyEmbedToken(token) : null

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bn-bg)] px-6 text-center text-[var(--bn-ink)]">
        <div className="max-w-md">
          <p className="bn-eyebrow mb-2">Embed</p>
          <h1 className="bn-title mb-3 text-[28px]">
            Session invalid or expired
          </h1>
          <p className="si text-[14px] text-[var(--bn-ink-2)]">
            Create a new embed session from your host app using a valid Aria API
            key.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen min-h-0 flex-col">
      <ChatPanel projectName={session.projectName} />
    </div>
  )
}
