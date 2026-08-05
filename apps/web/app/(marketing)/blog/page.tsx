import ResourcePageHero from "@/components/resources/ResourcePageHero";
import ContentCard from "@/components/resources/ContentCard";
import { blogPosts } from "@/lib/data/resources";

export const metadata = {
  title: "Blog — Bnii ARIA",
  description:
    "Product updates, guides, and insights from the Bnii ARIA team on enterprise AI, analytics, and knowledge intelligence.",
};

export default function BlogPage() {
  return (
    <>
      <ResourcePageHero
        label="Blog"
        title={
          <>
            Insights on enterprise{" "}
            <span className="hero-underline font-medium">intelligence</span>
          </>
        }
        description="Product updates, engineering deep-dives, and practical guides for teams building with ARIA."
      />

      <section className="page-container pb-16 sm:pb-20 md:pb-24 lg:pb-28">
        <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          Latest releases
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-6">
          {blogPosts.map((post) => (
            <ContentCard
              key={post.slug}
              title={post.title}
              description={post.excerpt}
              secondaryLink={{
                label: "Article details",
                href: `/blog/${post.slug}`,
              }}
              meta={[
                { label: "Date", value: post.date },
                { label: "Category", value: post.category },
              ]}
              cta={{
                label: "Read announcement",
                href: `/blog/${post.slug}`,
              }}
            />
          ))}
        </div>
      </section>
    </>
  );
}
