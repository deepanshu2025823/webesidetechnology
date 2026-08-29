import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, Tag as TagIcon } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { PostCard } from "@/components/sections/PostCard";
import { CtaBand } from "@/components/sections/CtaBand";
import { JsonLd } from "@/components/JsonLd";
import { ShareLinks } from "@/components/site/ShareLinks";
import { getPostBySlug, getPosts, getSettings } from "@/lib/queries";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { absoluteUrl, formatDate } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getPosts({ take: 50 });
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return buildMetadata({ title: "Article not found", noIndex: true });

  return buildMetadata({
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    keywords: post.metaKeywords,
    path: `/blog/${post.slug}`,
    image: post.coverImage,
    type: "article",
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
  });
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([getPostBySlug(slug), getSettings()]);
  if (!post) notFound();

  const related = (await getPosts({ take: 4 })).filter((p) => p.id !== post.id).slice(0, 3);
  const url = absoluteUrl(`/blog/${post.slug}`);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          url,
          mainEntityOfPage: url,
          ...(post.coverImage ? { image: absoluteUrl(post.coverImage) } : {}),
          ...(post.publishedAt ? { datePublished: new Date(post.publishedAt).toISOString() } : {}),
          dateModified: new Date(post.updatedAt).toISOString(),
          author: { "@type": post.author ? "Person" : "Organization", name: post.author?.name ?? settings.siteName },
          publisher: {
            "@type": "Organization",
            name: settings.siteName,
            logo: { "@type": "ImageObject", url: absoluteUrl(settings.logoLight) },
          },
          ...(post.category ? { articleSection: post.category.name } : {}),
        }}
      />

      <PageHero
        eyebrow={post.category?.name ?? "Article"}
        title={post.title}
        crumbs={[
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ]}
      />

      <article className="py-14 sm:py-16">
        <Container size="narrow">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-navy-900/10 pb-6 text-sm text-slate-500">
            {post.author ? (
              <span>
                By <span className="font-medium text-navy-900">{post.author.name}</span>
              </span>
            ) : null}
            {post.publishedAt ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                {formatDate(post.publishedAt)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              {post.readingMinutes} min read
            </span>
          </div>

          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={post.title}
              width={1200}
              height={675}
              priority
              className="mt-8 h-auto w-full rounded-2xl object-cover"
            />
          ) : null}

          {post.excerpt ? (
            <p className="mt-8 border-l-2 border-gold-400 pl-5 text-lg leading-relaxed text-navy-800">
              {post.excerpt}
            </p>
          ) : null}

          <div
            className="prose prose-brand mt-8 max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {post.tags.length ? (
            <ul className="mt-10 flex flex-wrap items-center gap-2">
              <li>
                <TagIcon className="size-4 text-gold-600" aria-hidden />
              </li>
              {post.tags.map(({ tag }) => (
                <li key={tag.id} className="rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-700">
                  {tag.name}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-10 border-t border-navy-900/10 pt-8">
            <ShareLinks url={url} title={post.title} />
          </div>
        </Container>
      </article>

      {related.length ? (
        <section className="bg-cream py-16 sm:py-20">
          <Container size="wide">
            <div className="flex items-end justify-between gap-6">
              <h2 className="text-2xl text-navy-900">Keep reading</h2>
              <Link href="/blog" className="text-sm font-semibold text-gold-700 hover:text-gold-900">
                All articles →
              </Link>
            </div>
            <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <li key={p.id}>
                  <PostCard post={p} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <CtaBand
        title={settings.ctaTitle}
        subtitle={settings.ctaSubtitle}
        buttonLabel={settings.ctaButton}
        buttonUrl={settings.ctaUrl}
        phone={settings.phone}
      />
    </>
  );
}
