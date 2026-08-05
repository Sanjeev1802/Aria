import { overviewFeatures } from "@/lib/data/features";
import FeatureRow from "./FeatureRow";

export default function FeaturesOverview() {
  return (
    <section id="features" className="page-container pb-16 sm:pb-20 md:pb-24 lg:pb-28">
      <div className="max-w-2xl">
        <h2 className="text-section-title font-serif text-foreground">
          Core capabilities
        </h2>
        <p className="mt-4 font-serif text-base leading-relaxed text-foreground/70 sm:mt-5 sm:text-lg">
          Connect analytics, knowledge, and your own data sources into a single
          workspace where every answer is grounded in real business context.
        </p>
      </div>

      <div className="mt-10 sm:mt-12 md:mt-16">
        {overviewFeatures.map((feature, index) => (
          <FeatureRow
            key={feature.slug}
            feature={feature}
            index={index}
            variant="light"
            anchorId={feature.slug}
          />
        ))}
      </div>
    </section>
  );
}
