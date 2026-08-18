import { featureDropdownItems } from "@/lib/data/features";

export default function HomeCapabilities() {
  return (
    <section className="border-t border-foreground/10">
      <div className="page-container py-8 sm:py-10">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-5 md:gap-8">
          {featureDropdownItems.map((item, index) => (
            <a
              key={item.slug}
              href={`/features#${item.slug}`}
              className="group min-w-0 border-t border-foreground/10 pt-6 first:border-t-0 first:pt-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6 md:pl-8 first:sm:border-l-0 first:sm:pl-0"
            >
              <span className="font-serif text-sm tabular-nums text-foreground/40">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-2 text-lg font-medium text-foreground transition-colors group-hover:text-foreground/80 sm:text-xl">
                {item.title}
              </h2>
              <p className="mt-2 font-serif text-sm leading-relaxed text-foreground/65 sm:text-base">
                {item.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
