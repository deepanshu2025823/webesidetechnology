"use client";

import { useActionState, useState } from "react";
import { saveService, type ActionState } from "@/app/admin/actions/content";
import { Alert, Card, FieldWrap, SubmitButton, Toggle, inputClass } from "@/components/admin/ui";
import { RichText } from "@/components/admin/RichText";
import { ImageInput } from "@/components/admin/ImageInput";
import { IconInput } from "@/components/admin/IconInput";
import { Repeater } from "@/components/admin/Repeater";
import { TagListInput } from "@/components/admin/TagListInput";
import { SeoFields } from "@/components/admin/SeoFields";
import { SlugField } from "@/components/admin/SlugField";

type ServiceValue = {
  id: string;
  title: string;
  slug: string;
  categoryId: string | null;
  shortDescription: string;
  icon: string;
  coverImage: string | null;
  heroTitle: string;
  heroSubtitle: string;
  content: string;
  features: unknown;
  processSteps: unknown;
  deliverables: unknown;
  priceFrom: number | null;
  priceUnit: string;
  isFeatured: boolean;
  status: string;
  order: number;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
};

export function ServiceForm({
  service,
  categories,
}: {
  service?: ServiceValue;
  categories: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveService, {});
  const [title, setTitle] = useState(service?.title ?? "");

  const list = (value: unknown) => (Array.isArray(value) ? (value as Record<string, string>[]) : []);
  const strings = (value: unknown) => (Array.isArray(value) ? (value as string[]) : []);

  return (
    <form action={action} className="space-y-6">
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Basics">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrap label="Service title" htmlFor="title" required className="sm:col-span-2">
                <input
                  id="title"
                  name="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Search Engine Optimisation"
                  className={inputClass}
                />
              </FieldWrap>

              <div className="sm:col-span-2">
                <SlugField prefix="/services/" defaultValue={service?.slug} titleValue={title} />
              </div>

              <FieldWrap
                label="Card description"
                htmlFor="shortDescription"
                help="Shown on the services grid and used as the fallback meta description."
                className="sm:col-span-2"
              >
                <textarea
                  id="shortDescription"
                  name="shortDescription"
                  rows={3}
                  defaultValue={service?.shortDescription}
                  className={inputClass}
                />
              </FieldWrap>

              <FieldWrap label="Service group" htmlFor="categoryId">
                <select id="categoryId" name="categoryId" defaultValue={service?.categoryId ?? ""} className={inputClass}>
                  <option value="">— Ungrouped —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Icon" htmlFor="icon">
                <IconInput name="icon" defaultValue={service?.icon ?? "Sparkles"} />
              </FieldWrap>
            </div>
          </Card>

          <Card title="Page header" description="The banner at the top of the service page.">
            <div className="grid gap-5">
              <FieldWrap label="Hero heading" htmlFor="heroTitle" help="Leave blank to use the service title.">
                <input id="heroTitle" name="heroTitle" defaultValue={service?.heroTitle} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Hero sub-heading" htmlFor="heroSubtitle">
                <textarea id="heroSubtitle" name="heroSubtitle" rows={2} defaultValue={service?.heroSubtitle} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Banner image" help="Used as the hero background and the social share image.">
                <ImageInput name="coverImage" defaultValue={service?.coverImage} folder="services" />
              </FieldWrap>
            </div>
          </Card>

          <Card title="Body content">
            <RichText name="content" defaultValue={service?.content ?? ""} placeholder="Describe the service in detail…" />
          </Card>

          <Card title="What's included" description="Rendered as a two-column feature grid.">
            <Repeater
              name="features"
              addLabel="Add feature"
              emptyLabel="No features added."
              defaultValue={list(service?.features)}
              shape={[
                { key: "title", label: "Feature" },
                { key: "description", label: "Description", type: "textarea" },
              ]}
            />
          </Card>

          <Card title="How the engagement runs" description="A numbered delivery workflow.">
            <Repeater
              name="processSteps"
              addLabel="Add step"
              emptyLabel="No steps added."
              defaultValue={list(service?.processSteps)}
              shape={[
                { key: "title", label: "Step" },
                { key: "description", label: "Description", type: "textarea" },
              ]}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Publishing">
            <div className="space-y-5">
              <FieldWrap label="Status" htmlFor="status">
                <select id="status" name="status" defaultValue={service?.status ?? "PUBLISHED"} className={inputClass}>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </FieldWrap>

              <Toggle
                name="isFeatured"
                label="Show on the home page"
                defaultChecked={service?.isFeatured ?? false}
              />

              <FieldWrap label="Sort order" htmlFor="order" help="Lower numbers appear first.">
                <input id="order" name="order" type="number" defaultValue={service?.order ?? 0} className={inputClass} />
              </FieldWrap>
            </div>
          </Card>

          <Card title="Pricing" description="Optional. Leave blank to hide.">
            <div className="grid gap-5">
              <FieldWrap label="Starting price (₹)" htmlFor="priceFrom">
                <input
                  id="priceFrom"
                  name="priceFrom"
                  type="number"
                  min={0}
                  defaultValue={service?.priceFrom ?? ""}
                  className={inputClass}
                />
              </FieldWrap>
              <FieldWrap label="Per" htmlFor="priceUnit">
                <select id="priceUnit" name="priceUnit" defaultValue={service?.priceUnit ?? "project"} className={inputClass}>
                  <option value="project">project</option>
                  <option value="month">month</option>
                  <option value="quarter">quarter</option>
                  <option value="year">year</option>
                  <option value="campaign">campaign</option>
                </select>
              </FieldWrap>
            </div>
          </Card>

          <Card title="Deliverables" description="Bullet list in the sidebar.">
            <TagListInput
              name="deliverables"
              defaultValue={strings(service?.deliverables)}
              placeholder="e.g. Monthly performance report"
            />
          </Card>

          <SeoFields
            path={`/services/${service?.slug ?? ""}`}
            defaults={{
              metaTitle: service?.metaTitle,
              metaDescription: service?.metaDescription,
              metaKeywords: service?.metaKeywords,
            }}
            fallbackTitle={title ? `${title} Services` : undefined}
            fallbackDescription={service?.shortDescription}
          />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-navy-900/10 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <SubmitButton>{service ? "Update service" : "Create service"}</SubmitButton>
      </div>
    </form>
  );
}
