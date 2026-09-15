import Link from "next/link";
import { FloatingPaths } from "@/components/chat/floating-paths";
import { AriaLogo } from "@/components/chat/AriaLogo";
import { ChevronLeftIcon } from "lucide-react";

export const authInputClassName =
  "box-border block h-11 w-full min-w-0 rounded-lg border border-brand-dark/15 bg-white/60 px-3 pl-10 text-sm text-brand-dark outline-none transition-colors placeholder:text-brand-dark/40 focus:border-accent/60 focus:bg-white focus:ring-2 focus:ring-accent/20 disabled:opacity-60";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-background lg:grid lg:grid-cols-2">
      <aside className="relative hidden min-h-dvh overflow-hidden border-r border-foreground/10 bg-brand-dark lg:flex lg:flex-col lg:p-10">
        <Link
          href="/"
          className="relative z-10 inline-flex items-center gap-2.5 text-brand-cream"
        >
          <AriaLogo className="h-6 w-auto" />
          <span className="text-[13px] font-semibold tracking-[0.18em]">
            BNII ARIA
          </span>
        </Link>
        <div className="relative z-10 mt-auto max-w-md pb-4">
          <blockquote className="flex flex-col gap-3">
            <p className="font-serif text-xl leading-relaxed text-brand-cream">
              &ldquo;ARIA transformed how our team turns enterprise data into
              decisions — every answer grounded in real business context.&rdquo;
            </p>
            <footer className="text-sm font-medium text-brand-cream/55">
              Enterprise analytics team
            </footer>
          </blockquote>
        </div>
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </aside>

      <section className="relative flex min-h-dvh min-w-0 flex-col bg-brand-cream text-brand-dark">
        <Link
          href="/"
          className="absolute top-[max(1.5rem,env(safe-area-inset-top))] left-[max(1.25rem,env(safe-area-inset-left))] z-10 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-brand-dark/60 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark sm:top-8 sm:left-8"
        >
          <ChevronLeftIcon className="size-4" />
          Home
        </Link>

        <div className="flex flex-1 items-center justify-center px-5 py-24 sm:px-10">
          <div className="w-full min-w-0 max-w-[360px]">
            <div className="mb-8">
              <h1 className="font-sans text-2xl font-semibold tracking-tight text-brand-dark">
                {title}
              </h1>
              <p className="mt-2 font-serif text-sm leading-relaxed text-brand-dark/65 sm:text-base">
                {description}
              </p>
            </div>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
