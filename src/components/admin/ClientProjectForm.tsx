"use client";

import { useActionState, useState } from "react";
import { saveProjectRecord, type ActionState } from "@/app/admin/actions/crm";
import { Alert, Card, FieldWrap, SubmitButton, inputClass } from "@/components/admin/ui";
import { CYCLES, GST_MODES, pricingLines } from "@/lib/project-pricing";
import { formatMoney } from "@/lib/utils";

type ProjectValue = {
  id: string;
  name: string;
  clientId: string;
  serviceId: string | null;
  managerId: string | null;
  stage: string;
  health: string;
  commercial: string;
  budget: number;
  projectCost?: number;
  subscriptionCost?: number;
  subscriptionCycle?: string;
  maintenanceCost?: number;
  maintenanceCycle?: string;
  gstMode?: string;
  gstRate?: number;
  startDate: string | null;
  endDate: string | null;
  objectives: string | null;
  inclusions: string | null;
  exclusions: string | null;
  assumptions: string | null;
  acceptanceCriteria: string | null;
};

const STAGES = ["DRAFT", "PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];
const HEALTH = ["ON_TRACK", "AT_RISK", "DELAYED"];
const COMMERCIALS = [
  ["ONE_TIME", "One-time"],
  ["MONTHLY_RETAINER", "Monthly retainer"],
  ["QUARTERLY", "Quarterly"],
  ["HALF_YEARLY", "Half-yearly"],
  ["ANNUAL", "Annual"],
  ["USAGE_BASED", "Usage-based"],
  ["MILESTONE_BASED", "Milestone-based"],
];

const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export function ClientProjectForm({
  project,
  clients,
  services,
  managers,
  defaultClientId,
}: {
  project?: ProjectValue;
  clients: { id: string; name: string; code: string }[];
  services: { id: string; title: string }[];
  managers: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveProjectRecord, {});
  const [pricing, setPricing] = useState({
    projectCost: project?.projectCost ?? 0,
    subscriptionCost: project?.subscriptionCost ?? 0,
    subscriptionCycle: project?.subscriptionCycle ?? "MONTHLY",
    maintenanceCost: project?.maintenanceCost ?? 0,
    maintenanceCycle: project?.maintenanceCycle ?? "MONTHLY",
    gstMode: project?.gstMode ?? "NONE",
    gstRate: project?.gstRate ?? 18,
  });
  const set = (key: keyof typeof pricing) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setPricing((p) => ({
      ...p,
      [key]: typeof p[key] === "number" ? Number(e.target.value) || 0 : e.target.value,
    }));
  const lines = pricingLines(pricing);

  return (
    <form action={action} className="space-y-6">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Project">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrap label="Project name" htmlFor="name" required className="sm:col-span-2">
                <input id="name" name="name" required defaultValue={project?.name} className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Client" htmlFor="clientId" required>
                <select
                  id="clientId"
                  name="clientId"
                  required
                  defaultValue={project?.clientId ?? defaultClientId ?? ""}
                  className={inputClass}
                >
                  <option value="">— Select a client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Service" htmlFor="serviceId">
                <select id="serviceId" name="serviceId" defaultValue={project?.serviceId ?? ""} className={inputClass}>
                  <option value="">— Not service specific —</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Project manager" htmlFor="managerId">
                <select id="managerId" name="managerId" defaultValue={project?.managerId ?? ""} className={inputClass}>
                  <option value="">— Me —</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Commercial model" htmlFor="commercial">
                <select id="commercial" name="commercial" defaultValue={project?.commercial ?? "ONE_TIME"} className={inputClass}>
                  {COMMERCIALS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </FieldWrap>
            </div>
          </Card>

          <Card
            title="Pricing"
            description="Fill only what applies — e.g. ₹25,000 to build it, then ₹5,000 a month subscription. Each is kept and billed separately."
          >
            <div className="grid gap-5 sm:grid-cols-6">
              <FieldWrap label="Project cost (₹)" htmlFor="projectCost" help="One-time: development, setup." className="sm:col-span-6">
                <input id="projectCost" name="projectCost" type="number" min={0} value={pricing.projectCost || ""} onChange={set("projectCost")} placeholder="25000" className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Subscription cost (₹)" htmlFor="subscriptionCost" className="sm:col-span-4">
                <input id="subscriptionCost" name="subscriptionCost" type="number" min={0} value={pricing.subscriptionCost || ""} onChange={set("subscriptionCost")} placeholder="5000" className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Billed" htmlFor="subscriptionCycle" className="sm:col-span-2">
                <select id="subscriptionCycle" name="subscriptionCycle" value={pricing.subscriptionCycle} onChange={set("subscriptionCycle")} className={inputClass}>
                  {CYCLES.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Maintenance cost (₹)" htmlFor="maintenanceCost" className="sm:col-span-4">
                <input id="maintenanceCost" name="maintenanceCost" type="number" min={0} value={pricing.maintenanceCost || ""} onChange={set("maintenanceCost")} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Billed" htmlFor="maintenanceCycle" className="sm:col-span-2">
                <select id="maintenanceCycle" name="maintenanceCycle" value={pricing.maintenanceCycle} onChange={set("maintenanceCycle")} className={inputClass}>
                  {CYCLES.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="GST" htmlFor="gstMode" className="sm:col-span-4">
                <select id="gstMode" name="gstMode" value={pricing.gstMode} onChange={set("gstMode")} className={inputClass}>
                  {GST_MODES.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </FieldWrap>
              <FieldWrap label="GST rate (%)" htmlFor="gstRate" className="sm:col-span-2">
                <input id="gstRate" name="gstRate" type="number" min={0} max={100} step="0.01" value={pricing.gstRate} onChange={set("gstRate")} disabled={pricing.gstMode === "NONE"} className={inputClass} />
              </FieldWrap>
            </div>

            {lines.length ? (
              <table className="mt-6 w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 font-medium">Charge</th>
                    {pricing.gstMode !== "NONE" ? (
                      <>
                        <th className="py-2 text-right font-medium">Base</th>
                        <th className="py-2 text-right font-medium">GST {pricing.gstRate}%</th>
                      </>
                    ) : null}
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-900/5">
                  {lines.map((l) => (
                    <tr key={l.key}>
                      <td className="py-2 text-navy-900">
                        {l.label} <span className="text-xs text-slate-500">{l.note}</span>
                      </td>
                      {pricing.gstMode !== "NONE" ? (
                        <>
                          <td className="py-2 text-right text-slate-600">{formatMoney(l.base)}</td>
                          <td className="py-2 text-right text-slate-600">{formatMoney(l.gst)}</td>
                        </>
                      ) : null}
                      <td className="py-2 text-right font-semibold text-navy-900">{formatMoney(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </Card>

          <Card
            title="Scope baseline"
            description="What was agreed. Editing these bumps the scope version so the original stays auditable."
          >
            <div className="grid gap-5">
              <FieldWrap label="Objectives" htmlFor="objectives">
                <textarea id="objectives" name="objectives" rows={3} defaultValue={project?.objectives ?? ""} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Inclusions" htmlFor="inclusions" help="One per line.">
                <textarea id="inclusions" name="inclusions" rows={4} defaultValue={project?.inclusions ?? ""} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Exclusions" htmlFor="exclusions" help="What this project explicitly does not cover.">
                <textarea id="exclusions" name="exclusions" rows={3} defaultValue={project?.exclusions ?? ""} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Assumptions" htmlFor="assumptions">
                <textarea id="assumptions" name="assumptions" rows={2} defaultValue={project?.assumptions ?? ""} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Acceptance criteria" htmlFor="acceptanceCriteria" help="How you both agree it's done.">
                <textarea
                  id="acceptanceCriteria"
                  name="acceptanceCriteria"
                  rows={3}
                  defaultValue={project?.acceptanceCriteria ?? ""}
                  className={inputClass}
                />
              </FieldWrap>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Delivery">
            <div className="space-y-5">
              <FieldWrap label="Stage" htmlFor="stage">
                <select id="stage" name="stage" defaultValue={project?.stage ?? "PLANNED"} className={inputClass}>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {pretty(s)}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Health" htmlFor="health">
                <select id="health" name="health" defaultValue={project?.health ?? "ON_TRACK"} className={inputClass}>
                  {HEALTH.map((h) => (
                    <option key={h} value={h}>
                      {pretty(h)}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Start date" htmlFor="startDate">
                <input id="startDate" name="startDate" type="date" defaultValue={project?.startDate ?? ""} className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Target end date" htmlFor="endDate">
                <input id="endDate" name="endDate" type="date" defaultValue={project?.endDate ?? ""} className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Internal budget (₹)" htmlFor="budget" help="Your own cost ceiling. What the client pays goes under Pricing.">
                <input id="budget" name="budget" type="number" min={0} defaultValue={project?.budget ?? 0} className={inputClass} />
              </FieldWrap>
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-navy-900/10 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <SubmitButton>{project ? "Update project" : "Create project"}</SubmitButton>
      </div>
    </form>
  );
}
