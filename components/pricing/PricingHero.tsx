export default function PricingHero() {
  return (
    <section className="page-container pb-10 pt-8 sm:pb-14 sm:pt-12 md:pb-16 md:pt-14 lg:pb-20 lg:pt-16">
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 md:items-end md:gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16 xl:gap-20">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/50 sm:text-sm">
            Pricing
          </p>
          <h1 className="text-section-title mt-4 font-serif text-foreground lg:mt-5">
            Plans that scale with your{" "}
            <span className="hero-underline font-medium">ambition</span>
          </h1>
        </div>

        <p className="min-w-0 font-serif text-hero-sub text-foreground/80 md:max-w-md lg:max-w-none">
          From pilot programs to enterprise deployments — flexible plans for
          teams of every size, with the intelligence and security your
          organization needs.
        </p>
      </div>
    </section>
  );
}
