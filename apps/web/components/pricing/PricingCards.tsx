import { pricingPlans } from "@/lib/data/pricing";

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PricingCards() {
  return (
    <section className="page-container pb-16 sm:pb-20 md:pb-24 lg:pb-28">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
        {pricingPlans.map((plan) => (
          <article
            key={plan.slug}
            id={plan.slug}
            className={`flex min-w-0 flex-col rounded-2xl border p-6 sm:p-8 ${
              plan.highlighted
                ? "border-foreground bg-foreground text-background"
                : "border-foreground/10 bg-background"
            }`}
          >
            <div className="flex-1">
              {plan.highlighted && (
                <p className="mb-4 text-xs uppercase tracking-[0.2em] text-background/50">
                  Most popular
                </p>
              )}

              <h2
                className={`text-card-title font-medium ${plan.highlighted ? "text-background" : "text-foreground"}`}
              >
                {plan.name}
              </h2>

              <p
                className={`mt-3 font-serif text-sm leading-relaxed sm:text-base ${plan.highlighted ? "text-background/70" : "text-foreground/70"}`}
              >
                {plan.description}
              </p>

              <div className="mt-8 flex flex-wrap items-baseline gap-2">
                <span
                  className={`text-3xl font-medium tracking-tight sm:text-4xl ${plan.highlighted ? "text-background" : "text-foreground"}`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-sm ${plan.highlighted ? "text-background/60" : "text-foreground/50"}`}
                >
                  {plan.priceDetail}
                </span>
              </div>

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex gap-3 text-sm leading-relaxed ${plan.highlighted ? "text-background/80" : "text-foreground/80"}`}
                  >
                    <CheckIcon />
                    <span className="min-w-0">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <a
              href={plan.ctaHref}
              className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 ${
                plan.highlighted
                  ? "bg-background text-foreground"
                  : "bg-foreground text-background"
              }`}
            >
              {plan.cta}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
