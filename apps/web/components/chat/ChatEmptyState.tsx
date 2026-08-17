"use client";

import { AriaLogo } from "@/components/chat/AriaLogo";

export function ChatEmptyState() {
  return (
    <div className="flex w-full flex-col items-center justify-center px-4 py-4">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-foreground/10 bg-background">
        <AriaLogo className="h-6 w-auto text-foreground" />
      </div>
      <h1 className="mt-4 text-center font-sans text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        What should we decide?
      </h1>
      <p className="mt-2 max-w-[36ch] text-center font-serif text-sm leading-relaxed text-foreground/60">
        Pressure-test the plan, shape a surface, or work a decision from the BNII note.
      </p>
    </div>
  );
}
