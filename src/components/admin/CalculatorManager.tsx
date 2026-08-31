"use client";

import { useActionState, useState } from "react";
import { ChevronDown, IndianRupee, Percent, Plus, Trash2 } from "lucide-react";
import {
  deleteCalculatorGroup,
  deleteCalculatorOption,
  saveCalculatorGroup,
  saveCalculatorOption,
  saveCalculatorSettings,
  type ActionState,
} from "@/app/admin/actions/calculator";
import { Alert, Badge, Card, FieldWrap, SubmitButton, Toggle, inputClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export type OptionRow = {
  id: string;
  label: string;
  help: string;
  price: number;
  percent: number;
  order: number;
  isDefault: boolean;
};

export type GroupRow = {
  id: string;
  label: string;
  help: string;
  kind: string;
  required: boolean;
  order: number;
  isActive: boolean;
  options: OptionRow[];
};

export type CalculatorConfig = {
  isEnabled: boolean;
  heading: string;
  subheading: string;
  basePrice: number;
  taxPercent: number;
  variancePct: number;
  ctaLabel: string;
  disclaimer: string;
};

const KINDS = [
  { value: "SINGLE", label: "Pick one", help: "Radio buttons — exactly one answer." },
  { value: "MULTI", label: "Pick any", help: "Checkboxes — any number of answers." },
  { value: "QUANTITY", label: "Per unit", help: "Priced per unit, with a counter (e.g. number of pages)." },
  { value: "TOGGLE", label: "Yes / no add-on", help: "A single optional extra." },
];

/**
 * Admin screen for the website's cost calculator.
 *
 * Questions are the client's "fields" and answers their "sub-fields"; both are
 * editable here, so reshaping the calculator when the pricing sheet changes is
 * data entry rather than a deploy.
 */
export function CalculatorManager({ config, groups }: { config: CalculatorConfig; groups: GroupRow[] }) {
  const [open, setOpen] = useState<string | null>(groups[0]?.id ?? null);
  const [addingGroup, setAddingGroup] = useState(false);

  return (
    <div className="space-y-6">
      <SettingsCard config={config} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-900">Questions</h2>
          <p className="mt-1 text-xs text-slate-500">
            Shown top to bottom in sort order. Each answer adds a fixed amount, or a percentage of the running total.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddingGroup((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
        >
          <Plus className="size-4" aria-hidden /> Add question
        </button>
      </div>

      {addingGroup ? (
        <Card title="New question">
          <GroupForm order={groups.length} onSaved={() => setAddingGroup(false)} />
        </Card>
      ) : null}

      {groups.length === 0 && !addingGroup ? (
        <div className="rounded-2xl border border-dashed border-navy-900/20 px-6 py-14 text-center">
          <p className="font-medium text-navy-900">No questions yet</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
            Add the first question — for example “What do you need?” with answers like Website, Mobile app and SEO.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white">
            <button
              type="button"
              onClick={() => setOpen((current) => (current === group.id ? null : group.id))}
              aria-expanded={open === group.id}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-navy-50 text-xs font-semibold text-navy-800">
                {group.order}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-navy-900">{group.label}</span>
                  {!group.isActive ? <Badge tone="muted">Hidden</Badge> : null}
                  {group.required ? <Badge tone="warn">Required</Badge> : null}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {KINDS.find((k) => k.value === group.kind)?.label ?? group.kind} · {group.options.length} answer
                  {group.options.length === 1 ? "" : "s"}
                </span>
              </span>
              <ChevronDown
                className={cn("size-5 shrink-0 text-slate-400 transition-transform", open === group.id && "rotate-180")}
                aria-hidden
              />
            </button>

            {open === group.id ? (
              <div className="space-y-6 border-t border-navy-900/10 bg-slate-50/60 p-5">
                <div className="rounded-xl border border-navy-900/10 bg-white p-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Question</p>
                  <GroupForm group={group} order={group.order} />
                </div>

                <div className="rounded-xl border border-navy-900/10 bg-white p-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Answers</p>
                  <OptionList group={group} />
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsCard({ config }: { config: CalculatorConfig }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCalculatorSettings, {});

  return (
    <Card title="Calculator settings" description="Copy and the maths applied to every estimate.">
      <form action={action} className="space-y-5">
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        {state.message ? <Alert tone="success">{state.message}</Alert> : null}

        <Toggle
          name="isEnabled"
          label="Show the calculator on the website"
          defaultChecked={config.isEnabled}
          help="When off, /cost-calculator returns a not-found page."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <FieldWrap label="Heading" htmlFor="heading">
            <input id="heading" name="heading" defaultValue={config.heading} className={inputClass} />
          </FieldWrap>

          <FieldWrap label="Button text" htmlFor="ctaLabel">
            <input id="ctaLabel" name="ctaLabel" defaultValue={config.ctaLabel} className={inputClass} />
          </FieldWrap>

          <FieldWrap label="Sub-heading" htmlFor="subheading" className="sm:col-span-2">
            <textarea id="subheading" name="subheading" rows={2} defaultValue={config.subheading} className={inputClass} />
          </FieldWrap>

          <FieldWrap label="Base price (₹)" htmlFor="basePrice" help="Added to every estimate — PM and QA time.">
            <input id="basePrice" name="basePrice" type="number" min={0} defaultValue={config.basePrice} className={inputClass} />
          </FieldWrap>

          <FieldWrap label="Tax %" htmlFor="taxPercent" help="18 for GST.">
            <input id="taxPercent" name="taxPercent" type="number" min={0} max={100} defaultValue={config.taxPercent} className={inputClass} />
          </FieldWrap>

          <FieldWrap
            label="Range spread %"
            htmlFor="variancePct"
            help="The estimate shows as a range: the total plus and minus this."
          >
            <input id="variancePct" name="variancePct" type="number" min={0} max={50} defaultValue={config.variancePct} className={inputClass} />
          </FieldWrap>

          <FieldWrap label="Disclaimer" htmlFor="disclaimer" className="sm:col-span-2">
            <textarea id="disclaimer" name="disclaimer" rows={2} defaultValue={config.disclaimer} className={inputClass} />
          </FieldWrap>
        </div>

        <div className="flex justify-end">
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </form>
    </Card>
  );
}

function GroupForm({ group, order, onSaved }: { group?: GroupRow; order: number; onSaved?: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(async (prev, form) => {
    const result = await saveCalculatorGroup(prev, form);
    if (result.ok) onSaved?.();
    return result;
  }, {});

  return (
    <form action={action} className="space-y-5">
      {group ? <input type="hidden" name="id" value={group.id} /> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FieldWrap label="Question" htmlFor={`label-${group?.id ?? "new"}`} required className="sm:col-span-2">
          <input
            id={`label-${group?.id ?? "new"}`}
            name="label"
            required
            defaultValue={group?.label}
            placeholder="What do you need?"
            className={inputClass}
          />
        </FieldWrap>

        <FieldWrap label="Helper text" htmlFor={`help-${group?.id ?? "new"}`} className="sm:col-span-2">
          <input
            id={`help-${group?.id ?? "new"}`}
            name="help"
            defaultValue={group?.help}
            placeholder="Shown under the question."
            className={inputClass}
          />
        </FieldWrap>

        <FieldWrap label="Answer type" htmlFor={`kind-${group?.id ?? "new"}`}>
          <select id={`kind-${group?.id ?? "new"}`} name="kind" defaultValue={group?.kind ?? "SINGLE"} className={inputClass}>
            {KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label} — {kind.help}
              </option>
            ))}
          </select>
        </FieldWrap>

        <FieldWrap label="Sort order" htmlFor={`order-${group?.id ?? "new"}`} help="Lower numbers appear first.">
          <input
            id={`order-${group?.id ?? "new"}`}
            name="order"
            type="number"
            defaultValue={group?.order ?? order}
            className={inputClass}
          />
        </FieldWrap>

        <Toggle name="required" label="An answer is required" defaultChecked={group?.required ?? false} />
        <Toggle name="isActive" label="Show this question" defaultChecked={group?.isActive ?? true} />
      </div>

      <div className="flex items-center justify-between gap-3">
        {group ? (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete “${group.label}” and all its answers?`)) void deleteCalculatorGroup(group.id);
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-red-600"
          >
            <Trash2 className="size-4" aria-hidden /> Delete question
          </button>
        ) : (
          <span />
        )}
        <SubmitButton>{group ? "Update question" : "Add question"}</SubmitButton>
      </div>
    </form>
  );
}

function OptionList({ group }: { group: GroupRow }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      {group.options.map((option) => (
        <details key={option.id} className="rounded-xl border border-navy-900/10">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-navy-900">{option.label}</span>
              {option.help ? <span className="block text-xs text-slate-500">{option.help}</span> : null}
            </span>
            <span className="shrink-0 text-xs font-semibold text-gold-700">
              {option.percent !== 100
                ? `${option.percent > 100 ? "+" : ""}${option.percent - 100}%`
                : option.price
                  ? `₹${option.price.toLocaleString("en-IN")}`
                  : "Included"}
            </span>
            {option.isDefault ? <Badge tone="neutral">Default</Badge> : null}
          </summary>
          <div className="border-t border-navy-900/10 p-4">
            <OptionForm groupId={group.id} option={option} order={option.order} />
          </div>
        </details>
      ))}

      {adding ? (
        <div className="rounded-xl border border-gold-400 bg-gold-50/40 p-4">
          <OptionForm groupId={group.id} order={group.options.length} onSaved={() => setAdding(false)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-navy-900/25 px-4 py-2.5 text-sm font-medium text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50"
        >
          <Plus className="size-4" aria-hidden /> Add answer
        </button>
      )}
    </div>
  );
}

function OptionForm({
  groupId,
  option,
  order,
  onSaved,
}: {
  groupId: string;
  option?: OptionRow;
  order: number;
  onSaved?: () => void;
}) {
  const [state, action] = useActionState<ActionState, FormData>(async (prev, form) => {
    const result = await saveCalculatorOption(prev, form);
    if (result.ok) onSaved?.();
    return result;
  }, {});

  const key = option?.id ?? `new-${groupId}`;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      {option ? <input type="hidden" name="id" value={option.id} /> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldWrap label="Answer" htmlFor={`opt-label-${key}`} required className="sm:col-span-2">
          <input
            id={`opt-label-${key}`}
            name="label"
            required
            defaultValue={option?.label}
            placeholder="Business website"
            className={inputClass}
          />
        </FieldWrap>

        <FieldWrap label="Helper text" htmlFor={`opt-help-${key}`} className="sm:col-span-2">
          <input id={`opt-help-${key}`} name="help" defaultValue={option?.help} className={inputClass} />
        </FieldWrap>

        <FieldWrap label="Price (₹)" htmlFor={`opt-price-${key}`} help="Flat amount added, or the per-unit rate.">
          <div className="relative">
            <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id={`opt-price-${key}`}
              name="price"
              type="number"
              min={0}
              defaultValue={option?.price ?? 0}
              className={cn(inputClass, "pl-9")}
            />
          </div>
        </FieldWrap>

        <FieldWrap
          label="Percent"
          htmlFor={`opt-percent-${key}`}
          help="100 = no change. 125 adds 25%; 90 takes 10% off."
        >
          <div className="relative">
            <Percent className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id={`opt-percent-${key}`}
              name="percent"
              type="number"
              min={1}
              max={500}
              defaultValue={option?.percent ?? 100}
              className={cn(inputClass, "pl-9")}
            />
          </div>
        </FieldWrap>

        <FieldWrap label="Sort order" htmlFor={`opt-order-${key}`}>
          <input
            id={`opt-order-${key}`}
            name="order"
            type="number"
            defaultValue={option?.order ?? order}
            className={inputClass}
          />
        </FieldWrap>

        <div className="self-end">
          <Toggle name="isDefault" label="Selected by default" defaultChecked={option?.isDefault ?? false} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {option ? (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete “${option.label}”?`)) void deleteCalculatorOption(option.id);
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-red-600"
          >
            <Trash2 className="size-4" aria-hidden /> Delete
          </button>
        ) : (
          <span />
        )}
        <SubmitButton>{option ? "Update answer" : "Add answer"}</SubmitButton>
      </div>
    </form>
  );
}
