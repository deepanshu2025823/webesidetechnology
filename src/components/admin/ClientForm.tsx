"use client";

import { useActionState } from "react";
import { saveClient, type ActionState } from "@/app/admin/actions/crm";
import { Alert, Card, FieldWrap, SubmitButton, inputClass } from "@/components/admin/ui";
import { TagListInput } from "@/components/admin/TagListInput";

type ClientValue = {
  id: string;
  name: string;
  industry: string;
  website: string;
  gstin: string;
  status: string;
  tags: unknown;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string | null;
  healthScore: number;
  ownerId: string | null;
};

const STATUSES = [
  { value: "PROSPECT", label: "Prospect" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "CHURNED", label: "Churned" },
];

const SUGGESTED_TAGS = ["VIP", "Retainer", "One-Time", "High Priority", "Renewal Due", "Payment Pending"];

export function ClientForm({
  client,
  owners,
}: {
  client?: ClientValue;
  owners: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveClient, {});
  const tags = Array.isArray(client?.tags) ? (client.tags as string[]) : [];

  return (
    <form action={action} className="space-y-6">
      {client ? <input type="hidden" name="id" value={client.id} /> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Company">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrap label="Company name" htmlFor="name" required className="sm:col-span-2">
                <input id="name" name="name" required defaultValue={client?.name} className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Industry" htmlFor="industry">
                <input id="industry" name="industry" defaultValue={client?.industry} placeholder="Healthcare" className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Website" htmlFor="website">
                <input id="website" name="website" type="text" inputMode="url" defaultValue={client?.website} className={inputClass} />
              </FieldWrap>

              <FieldWrap label="GSTIN" htmlFor="gstin">
                <input id="gstin" name="gstin" defaultValue={client?.gstin} className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Account manager" htmlFor="ownerId">
                <select id="ownerId" name="ownerId" defaultValue={client?.ownerId ?? ""} className={inputClass}>
                  <option value="">— Unassigned —</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Internal notes" htmlFor="notes" className="sm:col-span-2">
                <textarea id="notes" name="notes" rows={3} defaultValue={client?.notes ?? ""} className={inputClass} />
              </FieldWrap>
            </div>
          </Card>

          <Card title="Address">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrap label="Street address" htmlFor="addressLine" className="sm:col-span-2">
                <input id="addressLine" name="addressLine" defaultValue={client?.addressLine} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="City" htmlFor="city">
                <input id="city" name="city" defaultValue={client?.city} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="State" htmlFor="state">
                <input id="state" name="state" defaultValue={client?.state} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="PIN code" htmlFor="postalCode">
                <input id="postalCode" name="postalCode" defaultValue={client?.postalCode} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Country" htmlFor="country">
                <input id="country" name="country" defaultValue={client?.country ?? "India"} className={inputClass} />
              </FieldWrap>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <div className="space-y-5">
              <FieldWrap label="Relationship" htmlFor="status">
                <select id="status" name="status" defaultValue={client?.status ?? "PROSPECT"} className={inputClass}>
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap
                label="Health score"
                htmlFor="healthScore"
                help="0–100. Your read on delivery, payments and engagement."
              >
                <input
                  id="healthScore"
                  name="healthScore"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={client?.healthScore ?? 70}
                  className={inputClass}
                />
              </FieldWrap>
            </div>
          </Card>

          <Card title="Tags" description="Used to filter the client list.">
            <TagListInput name="tags" defaultValue={tags} placeholder="e.g. Retainer" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.map((t) => (
                <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
                  {t}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-navy-900/10 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <SubmitButton>{client ? "Update client" : "Create client"}</SubmitButton>
      </div>
    </form>
  );
}
