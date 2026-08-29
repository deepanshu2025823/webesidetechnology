import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { PostCard } from "@/components/sections/PostCard";
import { JsonLd } from "@/components/JsonLd";
import { prisma } from "@/lib/prisma";
import { getPostCategories, getPosts } from "@/lib/queries";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const categories = await getPostCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const category = await prisma.postCategory.findUnique({ where: { slug } });
  if (!category) return buildMetadata({ title: "Category not found", noIndex: true });

  return buildMetadata({
    title: `${category.name} Articles`,
    description: category.description || `Articles filed under ${category.name}.`,
    path: `/blog/category/${category.slug}`,
  });
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const category = await prisma.postCategory.findUnique({ where: { slug } });
  if (!category) notFound();

  const posts = await getPosts({ categorySlug: slug });

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Blog", path: "/blog" },
          { name: category.name, path: `/blog/category/${category.slug}` },
        ])}
      />
      <PageHero
        eyebrow="Category"
        title={category.name}
        description={category.description}
        crumbs={[
          { name: "Blog", path: "/blog" },
          { name: category.name, path: `/blog/category/${category.slug}` },
        ]}
      />

      <section className="py-16 sm:py-20">
        <Container size="wide">
          {posts.length ? (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-16 text-center text-slate-500">No posts in this category yet.</p>
          )}
        </Container>
      </section>
    </>
  );
}
