export default function Hero() {
  return (
    <section className="page-container pb-10 pt-8 sm:pb-14 sm:pt-10 md:pb-16 md:pt-12 lg:pb-20">
      <div className="grid min-w-0 grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
        <h1 className="text-hero min-w-0 break-words font-normal text-foreground">
          The Most{" "}
          <span className="hero-underline font-medium">Intelligent</span> AI
          Assistant for{" "}
          <span className="hero-underline font-medium">Business</span>
        </h1>

        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-4 font-serif text-hero-sub text-foreground/90 sm:gap-5">
            <p>
              ARIA transforms your enterprise data into trusted intelligence.
              Connect analytics, reports, internal knowledge, APIs, and your own
              business data into a single AI workspace where every answer is
              grounded in real business context.
            </p>
            <p>
              Stop searching across dashboards, spreadsheets, documents, and
              reports. Ask one question and receive actionable insights,
              executive-ready summaries, and recommendations backed by trusted
              sources.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Try ARIA
            </a>
            <a
              href="/features"
              className="inline-flex items-center justify-center rounded-full border border-foreground/20 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/40"
            >
              Explore features
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
