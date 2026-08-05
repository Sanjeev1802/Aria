import PricingHero from "@/components/pricing/PricingHero";
import PricingCards from "@/components/pricing/PricingCards";
import PricingComparison from "@/components/pricing/PricingComparison";
import PricingFaq from "@/components/pricing/PricingFaq";
import PricingCta from "@/components/pricing/PricingCta";

export const metadata = {
  title: "Pricing — Bnii ARIA",
  description:
    "Flexible plans for teams of every size — from pilot programs to enterprise deployments. Compare Starter, Business, and Enterprise plans.",
};

export default function PricingPage() {
  return (
    <>
      <PricingHero />
      <PricingCards />
      <PricingComparison />
      <PricingFaq />
      <PricingCta />
    </>
  );
}
