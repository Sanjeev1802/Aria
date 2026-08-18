import ResourcePageHero from "@/components/resources/ResourcePageHero";
import DocsSidebar from "@/components/resources/DocsSidebar";
import { docContent, docSections } from "@/lib/data/resources";

type DocsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export const metadata = {
  title: "Documentation — Bnii ARIA",
  description:
    "Documentation to help you get started with Bnii ARIA — workspace setup, features, APIs, and enterprise security.",
};

export default async function DocsPage({ searchParams }: DocsPageProps) {
  const { page: pageSlug } = await searchParams;
  const activeSlug =
    pageSlug && docContent[pageSlug] ? pageSlug : "introduction";
  const content = docContent[activeSlug];

  return (
    <>
      <ResourcePageHero
        label="Docs"
        title={
          <>
            Build with{" "}
            <span className="hero-underline font-medium">ARIA</span>
          </>
        }
        description="Guides and references to help your team connect data, search knowledge, and deploy enterprise AI."
      />
      <section className="page-container pb-16 sm:pb-20 md:pb-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[16rem_minmax(0,1fr)] xl:gap-20">
          <DocsSidebar activeSlug={activeSlug} sections={docSections} />

          <article className="min-w-0 border-t border-foreground/10 pt-8 lg:border-t-0 lg:pt-0">
            <h2 className="text-section-title break-words font-serif">
              {content.title}
            </h2>
            <div className="mt-8 max-w-2xl space-y-6 font-serif text-base leading-relaxed text-foreground/80 sm:text-lg">
              {content.body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
