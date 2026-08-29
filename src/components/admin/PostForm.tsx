"use client";

import { useActionState, useState } from "react";
import { savePost, type ActionState } from "@/app/admin/actions/content";
import { Alert, Card, FieldWrap, SubmitButton, Toggle, inputClass } from "@/components/admin/ui";
import { RichText } from "@/components/admin/RichText";
import { ImageInput } from "@/components/admin/ImageInput";
import { TagListInput } from "@/components/admin/TagListInput";
import { SeoFields } from "@/components/admin/SeoFields";
import { SlugField } from "@/components/admin/SlugField";

type PostValue = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  categoryId: string | null;
  authorId: string | null;
  status: string;
  isFeatured: boolean;
  publishedAt: string | null;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  tags: string[];
};

export function PostForm({
  post,
  categories,
  authors,
}: {
  post?: PostValue;
  categories: { id: string; name: string }[];
  authors: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(savePost, {});
  const [title, setTitle] = useState(post?.title ?? "");

  return (
    <form action={action} className="space-y-6">
      {post ? <input type="hidden" name="id" value={post.id} /> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Article">
            <div className="grid gap-5">
              <FieldWrap label="Title" htmlFor="title" required>
                <input
                  id="title"
                  name="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </FieldWrap>

              <SlugField prefix="/blog/" defaultValue={post?.slug} titleValue={title} />

              <FieldWrap label="Excerpt" htmlFor="excerpt" help="Shown on cards and used as the meta description fallback.">
                <textarea id="excerpt" name="excerpt" rows={3} defaultValue={post?.excerpt} className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Cover image">
                <ImageInput name="coverImage" defaultValue={post?.coverImage} folder="blog" />
              </FieldWrap>
            </div>
          </Card>

          <Card title="Body">
            <RichText name="content" defaultValue={post?.content ?? ""} minHeight={420} placeholder="Start writing…" />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Publishing">
            <div className="space-y-5">
              <FieldWrap label="Status" htmlFor="status">
                <select id="status" name="status" defaultValue={post?.status ?? "DRAFT"} className={inputClass}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </FieldWrap>

              <FieldWrap label="Publish date" htmlFor="publishedAt" help="Leave blank to publish now.">
                <input
                  id="publishedAt"
                  name="publishedAt"
                  type="datetime-local"
                  defaultValue={post?.publishedAt ?? ""}
                  className={inputClass}
                />
              </FieldWrap>

              <FieldWrap label="Category" htmlFor="categoryId">
                <select id="categoryId" name="categoryId" defaultValue={post?.categoryId ?? ""} className={inputClass}>
                  <option value="">— Uncategorised —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Author" htmlFor="authorId">
                <select id="authorId" name="authorId" defaultValue={post?.authorId ?? ""} className={inputClass}>
                  <option value="">— Me —</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <Toggle name="isFeatured" label="Feature this article" defaultChecked={post?.isFeatured ?? false} />
            </div>
          </Card>

          <Card title="Tags">
            <TagListInput name="tags" defaultValue={post?.tags ?? []} placeholder="e.g. Technical SEO" />
          </Card>

          <SeoFields
            path={`/blog/${post?.slug ?? ""}`}
            defaults={{
              metaTitle: post?.metaTitle,
              metaDescription: post?.metaDescription,
              metaKeywords: post?.metaKeywords,
            }}
            fallbackTitle={title}
            fallbackDescription={post?.excerpt}
          />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-navy-900/10 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <SubmitButton>{post ? "Update post" : "Create post"}</SubmitButton>
      </div>
    </form>
  );
}
