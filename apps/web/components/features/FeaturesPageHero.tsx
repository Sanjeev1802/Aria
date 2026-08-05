import { featureDropdownItems } from "@/lib/data/features";

export default function FeaturesPageHero() {
  return (
    <section className="page-container pb-10 pt-8 sm:pb-14 sm:pt-12 md:pb-16 md:pt-14 lg:pb-20 lg:pt-16">
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 md:items-end md:gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16 xl:gap-20">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/50 sm:text-sm">
            Features
          </p>
          <h1 className="text-section-title mt-4 font-serif text-foreground lg:mt-5">
            Everything you need to turn data into{" "}
            <span className="hero-underline font-medium">decisions</span>
          </h1>
        </div>

        <p className="min-w-0 font-serif text-hero-sub text-foreground/80 md:max-w-md lg:max-w-none">
          ARIA brings together analytics, enterprise knowledge, connected data,
          and AI into one intelligent workspace—helping teams make faster, more
          informed business decisions.
        </p>
      </div>

      <nav
        aria-label="Featured capabilities"
        className="mt-10 flex flex-wrap gap-2 sm:mt-12 md:mt-14"
      >
        {featureDropdownItems.map((item) => (
          <a
            key={item.slug}
            href={`#${item.slug}`}
            className="rounded-full border border-foreground/15 px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            {item.title}
          </a>
        ))}
        <a
          href="#enterprise-features"
          className="rounded-full border border-foreground/15 px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          Enterprise suite
        </a>
      </nav>
    </section>
  );
}
