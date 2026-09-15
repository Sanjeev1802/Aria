import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/data/resources";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: "Post not found" };
  return {
    title: `${post.title} — Bnii ARIA Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <article className="page-container py-10 sm:py-14 md:py-16 lg:py-20">
      <Link
        href="/blog"
        className="text-sm text-foreground/50 transition-colors hover:text-foreground"
      >
        ← Back to blog
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-foreground/50">
        <span>{post.category}</span>
        <span aria-hidden="true">·</span>
        <time>{post.date}</time>
        <span aria-hidden="true">·</span>
        <span>{post.readTime}</span>
      </div>

      <h1 className="text-section-title mt-6 max-w-4xl break-words font-serif">
        {post.title}
      </h1>

      <div className="prose-spacing mt-10 max-w-2xl space-y-6 font-serif text-base leading-relaxed text-foreground/80 sm:text-lg">
        <p>{post.excerpt}</p>
        <p>
          ARIA continues to evolve as teams demand faster, more trustworthy ways
          to turn enterprise data into decisions. This release reflects direct
          feedback from customers who need intelligence that is grounded in real
          business context — not generic AI responses.
        </p>
        <p>
          Whether you are connecting Atlas analytics, indexing internal
          documentation, or generating executive-ready reports, ARIA is built to
          meet you where your data already lives.
        </p>
      </div>
    </article>
  );
}
