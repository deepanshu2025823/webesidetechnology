"use client";

import { useActionState, useState } from "react";
import { savePage, type ActionState } from "@/app/admin/actions/content";
import { Alert, Card, FieldWrap, SubmitButton, Toggle, inputClass } from "@/components/admin/ui";
import { RichText } from "@/components/admin/RichText";
import { ImageInput } from "@/components/admin/ImageInput";
import { SeoFields } from "@/components/admin/SeoFields";
import { SlugField } from "@/components/admin/SlugField";

type PageValue = {
  id: string;
  title: string;
  slug: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string | null;
  content: string;
  status: string;
  showInSitemap: boolean;
  isSystem: boolean;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
};

export function PageForm({ page }: { page?: PageValue }) {
  const [state, action] = useActionState<ActionState, FormData>(savePage, {});
  const [title, setTitle] = useState(page?.title ?? "");

  return (
    <form action={action} className="space-y-6">
      {page ? <input type="hidden" name="id" value={page.id} /> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Page">
            <div className="grid gap-5">
              <FieldWrap label="Page title" htmlFor="title" required>
                <input
                  id="title"
                  name="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </FieldWrap>

              {page?.isSystem ? (
                <FieldWrap label="URL slug" help="This page is wired to a fixed route and its slug cannot change.">
                  <input name="slug" defaultValue={page.slug} readOnly className={`${inputClass} bg-slate-50`} />
                </FieldWrap>
              ) : (
                <SlugField prefix="/" defaultValue={page?.slug} titleValue={title} />
              )}

              <FieldWrap label="Hero heading" htmlFor="heroTitle" help="Leave blank to reuse the page title.">
                <input id="heroTitle" name="heroTitle" defaultValue={page?.heroTitle} className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Hero sub-heading" htmlFor="heroSubtitle">
                <textarea id="heroSubtitle" name="heroSubtitle" rows={2} defaultValue={page?.heroSubtitle} className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Hero background image">
                <ImageInput name="heroImage" defaultValue={page?.heroImage} folder="pages" />
              </FieldWrap>
            </div>
          </Card>

          <Card title="Content">
            <RichText name="content" defaultValue={page?.content ?? ""} minHeight={420} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Publishing">
            <div className="space-y-5">
              <FieldWrap label="Status" htmlFor="status">
                <select id="status" name="status" defaultValue={page?.status ?? "PUBLISHED"} className={inputClass}>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </FieldWrap>

              <Toggle
                name="showInSitemap"
                label="Include in sitemap"
                help="Turn off for thank-you or landing pages you don't want indexed."
                defaultChecked={page?.showInSitemap ?? true}
              />
            </div>
          </Card>

          <SeoFields
            path={`/${page?.slug ?? ""}`}
            defaults={{
              metaTitle: page?.metaTitle,
              metaDescription: page?.metaDescription,
              metaKeywords: page?.metaKeywords,
            }}
            fallbackTitle={title}
          />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-navy-900/10 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <SubmitButton>{page ? "Update page" : "Create page"}</SubmitButton>
      </div>
    </form>
  );
}
