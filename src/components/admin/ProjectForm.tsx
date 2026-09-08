"use client";

import { useActionState, useState } from "react";
import { saveProject, type ActionState } from "@/app/admin/actions/content";
import { Alert, Card, FieldWrap, SubmitButton, Toggle, inputClass } from "@/components/admin/ui";
import { RichText } from "@/components/admin/RichText";
import { ImageInput } from "@/components/admin/ImageInput";
import { Repeater } from "@/components/admin/Repeater";
import { TagListInput } from "@/components/admin/TagListInput";
import { SeoFields } from "@/components/admin/SeoFields";
import { SlugField } from "@/components/admin/SlugField";
import { GalleryInput } from "@/components/admin/GalleryInput";

type ProjectValue = {
  id: string;
  title: string;
  slug: string;
  clientName: string;
  industry: string;
  summary: string;
  challenge: string;
  solution: string;
  results: unknown;
  gallery: unknown;
  technologies: unknown;
  coverImage: string | null;
  websiteUrl: string;
  completedAt: string | null;
  isFeatured: boolean;
  status: string;
  order: number;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  serviceIds: string[];
  tags: string[];
};

export function ProjectForm({
  project,
  services,
}: {
  project?: ProjectValue;
  services: { id: string; title: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveProject, {});
  const [title, setTitle] = useState(project?.title ?? "");

  const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, string>[]) : []);
  const strings = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

  return (
    <form action={action} className="space-y-6">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Basics">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrap label="Project title" htmlFor="title" required className="sm:col-span-2">
                <input
                  id="title"
                  name="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </FieldWrap>

              <div className="sm:col-span-2">
                <SlugField prefix="/portfolio/" defaultValue={project?.slug} titleValue={title} />
              </div>

              <FieldWrap label="Client name" htmlFor="clientName">
                <input id="clientName" name="clientName" defaultValue={project?.clientName} className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Industry" htmlFor="industry">
                <input id="industry" name="industry" defaultValue={project?.industry} placeholder="Healthcare" className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Summary" htmlFor="summary" help="One or two lines shown on the portfolio card." className="sm:col-span-2">
                <textarea id="summary" name="summary" rows={2} defaultValue={project?.summary} className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Cover image" className="sm:col-span-2">
                <ImageInput name="coverImage" defaultValue={project?.coverImage} folder="portfolio" />
              </FieldWrap>
            </div>
          </Card>

          <Card title="The challenge">
            <FieldWrap label="What the client needed" htmlFor="challenge">
              <textarea id="challenge" name="challenge" rows={4} defaultValue={project?.challenge} className={inputClass} />
            </FieldWrap>
          </Card>

          <Card title="What we did">
            <RichText name="solution" defaultValue={project?.solution ?? ""} placeholder="Describe the approach and the build…" />
          </Card>

          <Card title="Gallery" description="Additional screenshots shown below the write-up.">
            <GalleryInput name="gallery" defaultValue={strings(project?.gallery)} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Publishing">
            <div className="space-y-5">
              <FieldWrap label="Status" htmlFor="status">
                <select id="status" name="status" defaultValue={project?.status ?? "PUBLISHED"} className={inputClass}>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </FieldWrap>

              <Toggle name="isFeatured" label="Feature on the home page" defaultChecked={project?.isFeatured ?? false} />

              <FieldWrap label="Completed" htmlFor="completedAt">
                <input
                  id="completedAt"
                  name="completedAt"
                  type="date"
                  defaultValue={project?.completedAt ?? ""}
                  className={inputClass}
                />
              </FieldWrap>

              <FieldWrap label="Live site URL" htmlFor="websiteUrl">
                <input id="websiteUrl" name="websiteUrl" type="url" defaultValue={project?.websiteUrl} className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Sort order" htmlFor="order">
                <input id="order" name="order" type="number" defaultValue={project?.order ?? 0} className={inputClass} />
              </FieldWrap>
            </div>
          </Card>

          <Card title="Services used" description="Links this case study to the service pages.">
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {services.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      name="serviceIds"
                      value={s.id}
                      defaultChecked={project?.serviceIds.includes(s.id)}
                      className="size-4 rounded border-navy-900/25 text-gold-600 focus:ring-gold-500"
                    />
                    {s.title}
                  </label>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Outcomes" description="Big numbers in the sidebar.">
            <Repeater
              name="results"
              addLabel="Add result"
              emptyLabel="No results added."
              defaultValue={list(project?.results)}
              shape={[
                { key: "value", label: "Value (e.g. +180%)" },
                { key: "label", label: "Label (e.g. organic traffic)" },
              ]}
            />
          </Card>

          <Card
            title="Tags"
            description="Filter chips on the portfolio page. They share the blog's tags, so a name used there means the same thing here."
          >
            <TagListInput name="tags" defaultValue={project?.tags ?? []} placeholder="e.g. Ecommerce" />
          </Card>

          <Card title="Stack & channels">
            <TagListInput name="technologies" defaultValue={strings(project?.technologies)} placeholder="e.g. Next.js" />
          </Card>

          <SeoFields
            path={`/portfolio/${project?.slug ?? ""}`}
            defaults={{
              metaTitle: project?.metaTitle,
              metaDescription: project?.metaDescription,
              metaKeywords: project?.metaKeywords,
            }}
            fallbackTitle={title ? `${title} — Case Study` : undefined}
            fallbackDescription={project?.summary}
          />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-navy-900/10 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <SubmitButton>{project ? "Update case study" : "Create case study"}</SubmitButton>
      </div>
    </form>
  );
}
