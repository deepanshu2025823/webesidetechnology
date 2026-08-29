"use client";

import { useActionState } from "react";
import { saveProjectRecord, type ActionState } from "@/app/admin/actions/crm";
import { Alert, Card, FieldWrap, SubmitButton, inputClass } from "@/components/admin/ui";

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

              <FieldWrap label="Budget (₹)" htmlFor="budget">
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
