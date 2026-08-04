"use client"

import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { MessageSquareIcon, ClockIcon } from "lucide-react"

const conversations = [
  {
    id: "1",
    title: "Market Entry Strategy for Southeast Asia",
    preview: "Key risks, regulatory gates, and go-to-market sequencing…",
    updatedAt: "2 hours ago",
    messages: 12,
  },
  {
    id: "2",
    title: "Competitive Landscape: B2B SaaS 2025",
    preview: "Positioning against low-cost APAC competitors…",
    updatedAt: "Yesterday",
    messages: 8,
  },
  {
    id: "3",
    title: "Supply Chain Resilience Post-2024",
    preview: "Scenario planning for dual-sourcing and inventory…",
    updatedAt: "3 days ago",
    messages: 15,
  },
]

export default function HistoryPage() {
  return (
    <AppShell title="History" eyebrow="Conversations">
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          <p className="si mb-6 text-[15px] text-[var(--bn-ink-2)]">
            Resume past chats or open a new one from the Chat page.
          </p>

          {conversations.length === 0 ? (
            <div className="bn-card flex flex-col items-center px-6 py-16 text-center">
              <MessageSquareIcon className="mb-3 size-6 text-[var(--bn-ink-3)]" />
              <p className="bn-title text-[22px]">No conversations yet</p>
              <p className="si mt-2 text-[14px] text-[var(--bn-ink-3)]">
                Start a brief in Chat — it will appear here.
              </p>
              <Link href="/chat" className="ask-submit mt-6 h-10 px-5">
                Start chatting
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((item) => (
                <Link
                  key={item.id}
                  href="/chat"
                  className="bn-list-item group block no-underline"
                >
                  <div className="flex w-full items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[rgba(139,107,61,0.08)]">
                      <MessageSquareIcon className="size-4 text-[var(--bn-acc)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="bn-title text-[17px] leading-snug">
                        {item.title}
                      </p>
                      <p className="si mt-1 truncate text-[13px] text-[var(--bn-ink-3)]">
                        {item.preview}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-[12px] text-[var(--bn-ink-3)]">
                        <span className="si inline-flex items-center gap-1">
                          <ClockIcon className="size-3" />
                          {item.updatedAt}
                        </span>
                        <span>{item.messages} messages</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  )
}
