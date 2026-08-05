export default function PricingCta() {
  return (
    <section className="border-t border-foreground/10 bg-background">
      <div className="page-container py-16 sm:py-20 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-section-title font-serif text-foreground">
            Ready to try ARIA?
          </h2>
          <p className="mt-4 font-serif text-base leading-relaxed text-foreground/70 sm:mt-5 sm:text-lg">
            Start your 14-day free trial or talk to our team about an
            enterprise deployment.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
            <a
              href="/contact"
              className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:w-auto"
            >
              Start free trial
            </a>
            <a
              href="/contact"
              className="inline-flex w-full items-center justify-center rounded-full border border-foreground/20 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-foreground/40 sm:w-auto"
            >
              Contact sales
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
