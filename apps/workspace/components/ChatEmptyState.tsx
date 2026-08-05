"use client";

import { AriaLogo } from "@/components/AriaLogo";

export function ChatEmptyState() {
  return (
    <div className="flex w-full flex-col items-center justify-center px-4 py-4">
      <div className="flex size-10 items-center justify-center rounded-xl border border-[#222] bg-[#111]">
        <AriaLogo className="h-5 w-auto text-[#e5e5e5]" />
      </div>
      <h1 className="mt-3 text-center text-[15px] font-medium tracking-[-0.02em] text-[#f5f5f5]">
        How can I help?
      </h1>
      <p className="mt-1 max-w-[28ch] text-center text-[12px] leading-relaxed text-[#737373]">
        Ask a question, draft a document, or work through a problem.
      </p>
    </div>
  );
}
