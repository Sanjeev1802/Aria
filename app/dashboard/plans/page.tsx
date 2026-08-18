import Link from "next/link";
import { RequireAuth } from "@/components/chat/RequireAuth";
import { PlansPageClient } from "@/components/account/PlansPageClient";
import { ArrowLeftIcon } from "lucide-react";

export default function PlansPage() {
  return (
    <RequireAuth>
      <div className="min-h-dvh bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-foreground/8 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" />
              Back to chat
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-8">
            <h1 className="text-[1.65rem] font-semibold tracking-tight text-foreground">
              Plans
            </h1>
            <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-foreground/55">
              Free, Pro, Business, or Enterprise — pick what fits you or your
              organization.
            </p>
          </div>
          <PlansPageClient />
        </main>
      </div>
    </RequireAuth>
  );
}
