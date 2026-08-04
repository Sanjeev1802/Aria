"use client"

export const dynamic = "force-dynamic"

import { useEffect, useRef, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { SendIcon, SparklesIcon } from "lucide-react"

const suggestedQuestions = [
  "What are the key risks in entering the Indian EV market in 2025?",
  "How should we position against low-cost competitors in APAC?",
  "What M&A opportunities exist in the climate-tech sector?",
]

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

export default function ChatPage() {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: trimmed },
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        content:
          "Brief generation is not wired yet. Your question has been captured — the research pipeline will respond here.",
      },
    ])
    setQuery("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(query)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(query)
    }
  }

  const hasMessages = messages.length > 0

  return (
    <AppShell title="Chat" eyebrow="Assistant">
      <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        {!hasMessages ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-4">
            <div className="mb-3 flex size-11 items-center justify-center rounded-[12px] bg-[rgba(139,107,61,0.1)]">
              <SparklesIcon className="size-5 text-[var(--bn-acc)]" />
            </div>
            <h1 className="bn-title mb-2 text-center text-[30px]">
              Ask <span className="si text-[var(--bn-acc)]">ARIA</span>
            </h1>
            <p className="si mb-8 max-w-md text-center text-[15px] leading-relaxed text-[var(--bn-ink-2)]">
              Submit a strategy question and receive a cited, board-ready
              editorial brief.
            </p>
            <div className="grid w-full max-w-2xl gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuery(q)
                    inputRef.current?.focus()
                  }}
                  className="bn-list-item w-full text-left"
                >
                  <p className="text-[13.5px] leading-snug text-[var(--bn-ink)]">
                    {q}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
            <div className="flex flex-col gap-6">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-[16px_16px_4px_16px] border-[0.5px] border-[rgba(139,107,61,0.25)] bg-[rgba(139,107,61,0.10)] px-4 py-3 text-[14.5px] leading-relaxed text-[var(--bn-ink)]">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex gap-3">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--bn-acc)]">
                      <SparklesIcon className="size-3.5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="si mb-1 text-[12px] text-[var(--bn-acc)]">
                        ARIA
                      </p>
                      <p className="bn-body-editorial text-[16px] text-[var(--bn-ink)]">
                        {message.content}
                      </p>
                    </div>
                  </div>
                )
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}
      </main>

      <div className="shrink-0 bg-[var(--bn-bg)] px-4 pb-5 pt-2 sm:px-6">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl">
          <div className="bn-composer items-end !rounded-[22px] !py-2 !pl-4 !pr-2">
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask ARIA anything…"
              className="max-h-40 min-h-[44px] flex-1 resize-none border-none bg-transparent py-2.5 font-sans text-[14.5px] leading-relaxed text-[var(--bn-ink)] outline-none placeholder:text-[var(--bn-ink-3)]"
            />
            <button
              type="submit"
              className="ask-submit mb-0.5 size-10 shrink-0 !rounded-full !p-0"
              disabled={!query.trim()}
              aria-label="Send"
            >
              <SendIcon className="size-4" />
            </button>
          </div>
          <p className="si mt-2.5 text-center text-[11px] text-[var(--bn-ink-3)]">
            ARIA cites sources. Always verify before board use.
          </p>
        </form>
      </div>
    </AppShell>
  )
}
