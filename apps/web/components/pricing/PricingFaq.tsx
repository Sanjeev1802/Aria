import { pricingFaqs } from "@/lib/data/pricing";

export default function PricingFaq() {
  return (
    <section className="page-container py-16 sm:py-20 md:py-24 lg:py-28">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-16 lg:gap-24">
        <div className="min-w-0">
          <h2 className="text-section-title font-serif text-foreground">
            Frequently asked questions
          </h2>
          <p className="mt-4 font-serif text-base leading-relaxed text-foreground/70 sm:mt-5 sm:text-lg">
            Everything you need to know about billing, trials, and enterprise
            plans.
          </p>
        </div>

        <dl className="min-w-0 divide-y divide-foreground/10">
          {pricingFaqs.map((faq) => (
            <div key={faq.question} className="py-6 first:pt-0 last:pb-0 sm:py-8">
              <dt className="text-base font-medium text-foreground sm:text-lg">
                {faq.question}
              </dt>
              <dd className="mt-3 font-serif text-sm leading-relaxed text-foreground/70 sm:text-base">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
