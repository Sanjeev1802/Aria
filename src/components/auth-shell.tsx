import { SparklesIcon } from "lucide-react"

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh bg-[var(--bn-bg)] lg:grid-cols-2">
      <aside className="relative flex flex-col justify-between overflow-hidden border-b-[0.5px] border-[var(--bn-line)] bg-[var(--bn-bg-2)] px-8 py-10 sm:px-12 lg:border-b-0 lg:border-r-[0.5px] lg:px-14 lg:py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 20% 20%, rgba(139,107,61,0.12), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(198,143,61,0.08), transparent 55%)",
          }}
        />

        <div className="relative">
          <div className="mb-10 flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-[8px] bg-[var(--bn-acc)]">
              <SparklesIcon className="size-4 text-white" />
            </div>
            <span className="si bn-title text-[24px] tracking-[-0.4px]">
              BNII ARIA
            </span>
          </div>

          <p className="bn-eyebrow mb-4">Institutional research</p>
          <h1 className="bn-title max-w-md text-[36px] leading-[1.15] tracking-[-0.5px] sm:text-[42px]">
            Board-ready briefs,{" "}
            <span className="si text-[var(--bn-acc)]">cited and clear</span>
          </h1>
          <p className="si mt-5 max-w-md text-[17px] leading-[1.78] text-[var(--bn-ink-2)]">
            Ask strategy questions in plain language. BNII ARIA returns
            editorial answers with sources you can take into the room.
          </p>
        </div>

        <div className="relative mt-12 space-y-5 lg:mt-0">
          <div className="bn-ornament">
            <span className="bn-ornament-dot" />
          </div>
          <blockquote className="border-l-2 border-[var(--bn-acc)] pl-[22px]">
            <p className="si text-[20px] leading-snug text-[var(--bn-ink)]">
              Built for teams who need research they can trust — and an API to
              embed it where work already happens.
            </p>
          </blockquote>
          <p className="si text-[12px] text-[var(--bn-ink-3)]">
            Secure sign-in · API keys · Role-based team access
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[380px]">{children}</div>
      </main>
    </div>
  )
}
