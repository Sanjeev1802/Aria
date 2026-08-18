export default function HomeStatement() {
  return (
    <section className="rounded-t-2xl bg-dark text-background sm:rounded-t-[2rem] md:rounded-t-[2.5rem] lg:rounded-t-[3rem]">
      <div className="page-container py-12 sm:py-16 md:py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-center md:gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
          <h2 className="text-section-title font-serif">
            Bnii ARIA is built on hard questions
          </h2>
          <div className="min-w-0">
            <p className="font-serif text-base leading-relaxed text-background/70 sm:text-lg">
              Explore enterprise analytics, AI knowledge search, business
              memory, and the full suite of intelligent features built for
              modern teams.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/features"
                className="inline-flex items-center justify-center rounded-full bg-background px-6 py-3 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
              >
                Explore features
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-background/30 px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-background/10"
              >
                View pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
