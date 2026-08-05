import ResourcePageHero from "@/components/resources/ResourcePageHero";
import { changelogEntries } from "@/lib/data/resources";

export const metadata = {
  title: "Changelog — Bnii ARIA",
  description:
    "See what's new in Bnii ARIA — releases, features, improvements, and fixes.",
};

const typeLabels = {
  feature: "Feature",
  improvement: "Improvement",
  fix: "Fix",
} as const;

const typeStyles = {
  feature: "bg-foreground/10 text-foreground",
  improvement: "bg-foreground/5 text-foreground/70",
  fix: "bg-foreground/5 text-foreground/60",
};

export default function ChangelogPage() {
  return (
    <>
      <ResourcePageHero
        label="Changelog"
        title={
          <>
            What&apos;s new in{" "}
            <span className="hero-underline font-medium">ARIA</span>
          </>
        }
        description="Track every release — new features, improvements, and fixes as we ship them."
      />

      <section className="page-container pb-16 sm:pb-20 md:pb-24 lg:pb-28">
        <div className="max-w-3xl min-w-0">
          {changelogEntries.map((entry, index) => (
            <article
              key={entry.version}
              className={`border-t border-foreground/10 py-10 sm:py-12 ${
                index === 0 ? "border-t-0 pt-0" : ""
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
                  v{entry.version}
                </h2>
                <time className="font-serif text-sm text-foreground/50 sm:text-base">
                  {entry.date}
                </time>
              </div>

              <ul className="mt-6 space-y-4 sm:mt-8">
                {entry.changes.map((change) => (
                  <li
                    key={change.text}
                    className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4"
                  >
                    <span
                      className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${typeStyles[change.type]}`}
                    >
                      {typeLabels[change.type]}
                    </span>
                    <span className="min-w-0 font-serif text-base leading-relaxed text-foreground/80">
                      {change.text}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-t-2xl bg-dark px-5 py-14 text-background sm:rounded-t-[2rem] sm:px-8 sm:py-16 md:rounded-t-[2.5rem] lg:rounded-t-[3rem]">
        <div className="page-container text-center">
          <p className="font-serif text-lg text-background/70 sm:text-xl">
            Subscribe to release notifications
          </p>
          <a
            href="/contact"
            className="mt-6 inline-flex items-center rounded-full bg-background px-6 py-3 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
          >
            Get updates
          </a>
        </div>
      </section>
    </>
  );
}
