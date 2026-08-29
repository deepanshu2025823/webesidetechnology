"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Card, FieldWrap, inputClass } from "@/components/admin/ui";

/** Meta title/description/keywords with a live Google-style preview. */
export function SeoFields({
  defaults,
  path,
  fallbackTitle,
  fallbackDescription,
}: {
  defaults: { metaTitle?: string; metaDescription?: string; metaKeywords?: string };
  path: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
}) {
  const [title, setTitle] = useState(defaults.metaTitle ?? "");
  const [description, setDescription] = useState(defaults.metaDescription ?? "");

  const shownTitle = title || fallbackTitle || "Page title";
  const shownDescription = description || fallbackDescription || "Add a meta description to control this snippet.";

  return (
    <Card title="Search engine listing" description="How this page can appear in Google results.">
      <div className="mb-6 rounded-xl border border-navy-900/10 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Search className="size-3.5" aria-hidden />
          Preview
        </div>
        <p className="mt-3 truncate text-xs text-emerald-700">sahabindia.com{path}</p>
        <p className="mt-1 line-clamp-1 text-lg text-[#1a0dab]">{shownTitle}</p>
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{shownDescription}</p>
      </div>

      <div className="space-y-5">
        <FieldWrap
          label="Meta title"
          htmlFor="metaTitle"
          help={`${title.length}/60 characters — leave blank to use the page title.`}
        >
          <input
            id="metaTitle"
            name="metaTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className={inputClass}
          />
        </FieldWrap>

        <FieldWrap
          label="Meta description"
          htmlFor="metaDescription"
          help={`${description.length}/160 characters is the sweet spot.`}
        >
          <textarea
            id="metaDescription"
            name="metaDescription"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </FieldWrap>

        <FieldWrap
          label="Focus keywords"
          htmlFor="metaKeywords"
          help="Comma separated. Used for the keywords meta tag."
        >
          <input
            id="metaKeywords"
            name="metaKeywords"
            defaultValue={defaults.metaKeywords ?? ""}
            placeholder="web development company, seo services"
            className={inputClass}
          />
        </FieldWrap>
      </div>
    </Card>
  );
}
