"use client";

import type { ChatMessage } from "@/lib/aria/types";
import { AriaLogo } from "@/components/AriaLogo";

export function ChatMessageRow({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap text-right text-[13px] leading-5 text-[#f5f5f5]">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-[#222] bg-[#111]">
        <AriaLogo className="h-3 w-auto text-[#d88a68]" />
      </div>
      <div className="min-w-0 flex-1 whitespace-pre-wrap pt-0.5 text-[13px] leading-5 text-[#d4d4d4]">
        {message.content}
      </div>
    </div>
  );
}
