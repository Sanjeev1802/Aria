import FeaturesPageHero from "@/components/features/FeaturesPageHero";
import FeaturesOverview from "@/components/features/FeaturesOverview";
import FeaturesEnterprise from "@/components/features/FeaturesEnterprise";

export const metadata = {
  title: "Features — Bnii ARIA",
  description:
    "Explore ARIA's enterprise analytics, AI knowledge search, business memory, validation engine, and more — everything you need to turn data into decisions.",
};

export default function FeaturesPage() {
  return (
    <>
      <FeaturesPageHero />
      <FeaturesOverview />
      <FeaturesEnterprise />
    </>
  );
}
