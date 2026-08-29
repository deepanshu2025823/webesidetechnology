"use client";

import { useState } from "react";
import { FieldWrap, inputClass } from "@/components/admin/ui";
import { slugify } from "@/lib/utils";

/**
 * Slug that follows the title until an editor types their own.
 *
 * The auto value is derived during render rather than synced in an effect, so
 * typing a title never triggers a second render pass.
 */
export function SlugField({
  prefix,
  defaultValue = "",
  titleValue,
}: {
  prefix: string;
  defaultValue?: string;
  titleValue: string;
}) {
  const [custom, setCustom] = useState<string | null>(defaultValue || null);
  const slug = custom ?? slugify(titleValue);

  return (
    <FieldWrap label="URL slug" htmlFor="slug" help={`${prefix}${slug || "…"}`}>
      <input
        id="slug"
        name="slug"
        value={slug}
        onChange={(e) => setCustom(e.target.value)}
        className={inputClass}
      />
    </FieldWrap>
  );
}
