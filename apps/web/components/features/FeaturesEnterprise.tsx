import { enterpriseFeatures } from "@/lib/data/features";
import FeatureRow from "./FeatureRow";

const enterpriseOnlyAnchors = new Set(["business-memory", "validation-engine"]);

export default function FeaturesEnterprise() {
  return (
    <section
      id="enterprise-features"
      className="rounded-t-2xl bg-dark text-background sm:rounded-t-[2rem] md:rounded-t-[2.5rem] lg:rounded-t-[3rem]"
    >
      <div className="page-container py-16 sm:py-20 md:py-24 lg:py-28 xl:py-32">
        <div className="grid min-w-0 grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-end md:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-20">
          <h2 className="text-section-title font-serif">
            Intelligent features built for enterprise
          </h2>
          <p className="font-serif text-base leading-relaxed text-background/70 sm:text-lg md:max-w-xl lg:max-w-2xl">
            From business memory and validation to executive reporting and
            secure APIs—ARIA scales with teams, departments, and
            enterprise-wide intelligence from a single platform.
          </p>
        </div>

        <div className="mt-10 sm:mt-12 md:mt-16">
          {enterpriseFeatures.map((feature, index) => (
            <FeatureRow
              key={`enterprise-${feature.slug}`}
              feature={feature}
              index={index}
              variant="dark"
              anchorId={
                enterpriseOnlyAnchors.has(feature.slug)
                  ? feature.slug
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
