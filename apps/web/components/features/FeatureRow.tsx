import type { Feature } from "@/lib/data/features";

type FeatureRowProps = {
  feature: Feature;
  index: number;
  variant?: "light" | "dark";
  anchorId?: string;
};

export default function FeatureRow({
  feature,
  index,
  variant = "light",
  anchorId,
}: FeatureRowProps) {
  const isDark = variant === "dark";
  const number = String(index + 1).padStart(2, "0");

  return (
    <article
      id={anchorId}
      className={`scroll-mt-28 grid grid-cols-1 gap-4 border-t py-8 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-6 sm:py-10 md:grid-cols-[5rem_minmax(0,14rem)_minmax(0,1fr)] md:gap-x-10 md:gap-y-0 lg:gap-x-14 lg:py-12 ${
        isDark ? "border-background/15" : "border-foreground/10"
      }`}
    >
      <span
        className={`font-serif text-sm tabular-nums sm:pt-1 ${isDark ? "text-background/40" : "text-foreground/40"}`}
      >
        {number}
      </span>

      <h3
        className={`min-w-0 text-card-title font-medium leading-snug sm:col-start-2 md:col-start-2 ${isDark ? "text-background" : "text-foreground"}`}
      >
        {feature.title}
      </h3>

      <p
        className={`min-w-0 font-serif text-base leading-relaxed sm:col-start-2 md:col-start-3 md:max-w-xl lg:max-w-2xl lg:text-lg ${isDark ? "text-background/70" : "text-foreground/70"}`}
      >
        {feature.description}
      </p>
    </article>
  );
}
