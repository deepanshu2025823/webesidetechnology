import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

export type PostCardData = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: Date | null;
  readingMinutes: number;
  category: { name: string; slug: string } | null;
};

export function PostCard({ post, priority = false }: { post: PostCardData; priority?: boolean }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-navy-900/10 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-brand">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-navy-100">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 380px"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center bg-navy-900">
            <Image src="/brand/logo-mark-light.png" alt="" width={512} height={666} className="h-20 w-auto opacity-50" />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-6">
        {post.category ? (
          <Link
            href={`/blog/category/${post.category.slug}`}
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-700 hover:text-gold-900"
          >
            {post.category.name}
          </Link>
        ) : null}

        <h3 className="mt-2 text-lg font-semibold leading-snug text-navy-900">
          <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-gold-800">
            {post.title}
          </Link>
        </h3>

        <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>

        <div className="mt-5 flex items-center gap-4 border-t border-navy-900/5 pt-4 text-xs text-slate-500">
          {post.publishedAt ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              {formatDate(post.publishedAt)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />
            {post.readingMinutes} min read
          </span>
        </div>
      </div>
    </article>
  );
}
