"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/aria/types";
import { ChatMessageRow } from "@/components/ChatMessage";

type ChatThreadProps = {
  messages: ChatMessage[];
  thinking: boolean;
};

export function ChatThread({ messages, thinking }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  return (
    <div className="mx-auto flex w-full max-w-[40rem] flex-col gap-4 px-3 py-4 sm:px-4 sm:py-5">
      {messages.map((message) => (
        <ChatMessageRow key={message.id} message={message} />
      ))}
      {thinking ? (
        <div className="flex items-center gap-2 pl-0.5 text-[12px] text-[#737373]">
          <span className="inline-flex gap-1">
            <span className="size-1 animate-pulse rounded-full bg-[#d88a68]/80" />
            <span className="size-1 animate-pulse rounded-full bg-[#d88a68]/80 [animation-delay:150ms]" />
            <span className="size-1 animate-pulse rounded-full bg-[#d88a68]/80 [animation-delay:300ms]" />
          </span>
          Thinking…
        </div>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
