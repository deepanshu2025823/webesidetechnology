import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { PostCard } from "@/components/sections/PostCard";
import { JsonLd } from "@/components/JsonLd";
import { countPosts, getPostCategories, getPosts } from "@/lib/queries";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

const PER_PAGE = 9;

export async function generateMetadata() {
  return buildMetadata({
    title: "Insights, Guides & Agency Notes",
    description:
      "Practical articles on SEO, paid media, social, content and building software that actually converts.",
    path: "/blog",
  });
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const current = Math.max(1, Number(page) || 1);

  const [posts, total, categories] = await Promise.all([
    getPosts({ take: PER_PAGE, skip: (current - 1) * PER_PAGE }),
    countPosts(),
    getPostCategories(),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Blog", path: "/blog" }])} />
      <PageHero
        eyebrow="Insights"
        title="Writing from the team that does the work"
        description="Field notes on search, advertising, content and product — no fluff, no recycled listicles."
        crumbs={[{ name: "Blog", path: "/blog" }]}
      />

      <section className="py-16 sm:py-20">
        <Container size="wide">
          {categories.length ? (
            <nav aria-label="Categories" className="mb-10 flex flex-wrap gap-2">
              <Link
                href="/blog"
                className="rounded-full bg-navy-900 px-4 py-2 text-sm font-medium text-white"
              >
                All posts
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/blog/category/${c.slug}`}
                  className="rounded-full border border-navy-900/15 px-4 py-2 text-sm font-medium text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50 hover:text-gold-800"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          ) : null}

          {posts.length ? (
            <>
              <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post, i) => (
                  <li key={post.id}>
                    <PostCard post={post} priority={i < 3} />
                  </li>
                ))}
              </ul>

              {pages > 1 ? (
                <nav aria-label="Pagination" className="mt-14 flex justify-center gap-2">
                  {Array.from({ length: pages }).map((_, i) => (
                    <Link
                      key={i}
                      href={i === 0 ? "/blog" : `/blog?page=${i + 1}`}
                      aria-current={current === i + 1 ? "page" : undefined}
                      className={cn(
                        "grid size-10 place-items-center rounded-full text-sm font-medium transition-colors",
                        current === i + 1
                          ? "bg-navy-900 text-white"
                          : "border border-navy-900/15 text-navy-800 hover:border-gold-500 hover:text-gold-800",
                      )}
                    >
                      {i + 1}
                    </Link>
                  ))}
                </nav>
              ) : null}
            </>
          ) : (
            <p className="py-16 text-center text-slate-500">The first articles are on their way.</p>
          )}
        </Container>
      </section>
    </>
  );
}
