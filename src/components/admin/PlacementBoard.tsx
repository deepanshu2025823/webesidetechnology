"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { FileText, GraduationCap, Send, Trash2, UserPlus } from "lucide-react";
import {
  deleteApplication,
  deleteCandidate,
  saveApplication,
  saveCandidate,
  setApplicationStage,
  setCandidateStatus,
  type ActionState,
} from "@/app/admin/actions/placements";
import { Alert, Badge, Card, EmptyState, SubmitButton, inputClass } from "@/components/admin/ui";
import { FileInput } from "@/components/admin/FileInput";
import { TagListInput } from "@/components/admin/TagListInput";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export type CandidateRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  source: "ACADEMY" | "EXTERNAL";
  course: string;
  batch: string;
  qualification: string;
  skills: string[];
  experienceYears: number;
  expectedCtc: number;
  noticeDays: number;
  resumeUrl: string;
  resumeName: string;
  portfolioUrl: string;
  linkedinUrl: string;
  status: string;
  rating: number;
  notes: string | null;
  applications: {
    id: string;
    role: string;
    stage: string;
    partnerName: string;
    interviewAt: string | null;
    offerCtc: number | null;
  }[];
};

const CANDIDATE_STATUSES = ["NEW", "SHORTLISTED", "IN_PROCESS", "PLACED", "ON_HOLD", "REJECTED"];
const STAGES = ["SENT", "SHORTLISTED", "INTERVIEW", "OFFERED", "PLACED", "REJECTED", "WITHDRAWN"];

const STATUS_TONE: Record<string, "neutral" | "success" | "warn" | "muted"> = {
  NEW: "neutral",
  SHORTLISTED: "neutral",
  IN_PROCESS: "warn",
  PLACED: "success",
  ON_HOLD: "muted",
  REJECTED: "muted",
};

const STAGE_TONE: Record<string, "neutral" | "success" | "warn" | "muted"> = {
  SENT: "neutral",
  SHORTLISTED: "neutral",
  INTERVIEW: "warn",
  OFFERED: "warn",
  PLACED: "success",
  REJECTED: "muted",
  WITHDRAWN: "muted",
};

const pretty = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");

/**
 * Candidate database and placement pipeline.
 *
 * One row per person, expanded to show every company they have been put in
 * front of. The CV is uploaded here rather than emailed around, so whoever
 * picks up the conversation has the current one.
 */
export function PlacementBoard({
  candidates,
  partners,
  editable,
}: {
  candidates: CandidateRow[];
  partners: { id: string; name: string }[];
  editable: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const editing = candidates.find((c) => c.id === editingId) ?? null;

  return (
    <>
      {editable ? (
        adding || editing ? (
          <CandidateForm
            candidate={editing}
            onDone={() => {
              setAdding(false);
              setEditingId(null);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mb-6 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <UserPlus className="size-4" aria-hidden /> Add candidate
          </button>
        )
      ) : null}

      {candidates.length === 0 ? (
        <EmptyState
          title="No candidates yet"
          description="Add a student from the academy or someone who applied from outside, upload their CV, and start putting them in front of partners."
        />
      ) : (
        <ul className="space-y-4">
          {candidates.map((candidate) => (
            <li key={candidate.id} className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <p className="font-semibold text-navy-900">{candidate.name}</p>
                    <Badge tone={STATUS_TONE[candidate.status] ?? "neutral"}>{pretty(candidate.status)}</Badge>
                    {candidate.source === "ACADEMY" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-2.5 py-0.5 text-[11px] font-semibold text-gold-800">
                        <GraduationCap className="size-3" aria-hidden /> Academy
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        External
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {[
                      [candidate.email, candidate.phone].filter(Boolean).join(" · "),
                      candidate.city,
                      candidate.experienceYears ? `${candidate.experienceYears} yr exp` : "Fresher",
                      candidate.expectedCtc ? `expects ${formatMoney(candidate.expectedCtc)}` : "",
                      candidate.source === "ACADEMY"
                        ? [candidate.course, candidate.batch].filter(Boolean).join(" · ")
                        : candidate.qualification,
                    ]
                      .filter(Boolean)
                      .join(" — ")}
                  </p>

                  {candidate.skills.length ? (
                    <ul className="mt-2.5 flex flex-wrap gap-1.5">
                      {candidate.skills.slice(0, 8).map((skill) => (
                        <li key={skill} className="rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] text-navy-700">
                          {skill}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {candidate.resumeUrl ? (
                    <a
                      href={candidate.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-navy-900/15 px-3 py-2 text-xs font-medium text-navy-800 hover:border-gold-500 hover:bg-gold-50"
                    >
                      <FileText className="size-3.5" aria-hidden />
                      CV
                    </a>
                  ) : (
                    <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">No CV</span>
                  )}

                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === candidate.id ? null : candidate.id)}
                    aria-expanded={expanded === candidate.id}
                    className="rounded-lg border border-navy-900/15 px-3 py-2 text-xs font-medium text-navy-800 hover:bg-slate-50"
                  >
                    {candidate.applications.length
                      ? `${candidate.applications.length} submission${candidate.applications.length === 1 ? "" : "s"}`
                      : "Submissions"}
                  </button>

                  {editable ? (
                    <>
                      <StatusSelect candidate={candidate} />
                      <button
                        type="button"
                        onClick={() => {
                          setAdding(false);
                          setEditingId(candidate.id);
                        }}
                        className="rounded-lg border border-navy-900/15 px-3 py-2 text-xs font-medium text-navy-800 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <RemoveCandidate id={candidate.id} name={candidate.name} />
                    </>
                  ) : null}
                </div>
              </div>

              {expanded === candidate.id ? (
                <Submissions candidate={candidate} partners={partners} editable={editable} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function StatusSelect({ candidate }: { candidate: CandidateRow }) {
  const [, startTransition] = useTransition();

  return (
    <form
      action={setCandidateStatus.bind(null, candidate.id)}
      onChange={(e) => startTransition(() => (e.currentTarget as HTMLFormElement).requestSubmit())}
    >
      <select
        name="status"
        defaultValue={candidate.status}
        aria-label={`Status for ${candidate.name}`}
        className="rounded-lg border border-navy-900/15 px-2.5 py-2 text-xs"
      >
        {CANDIDATE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {pretty(s)}
          </option>
        ))}
      </select>
    </form>
  );
}

function RemoveCandidate({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [, startTransition] = useTransition();

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => startTransition(() => void deleteCandidate(id))}
          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg px-2 py-2 text-xs text-slate-500 hover:bg-slate-100"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
      aria-label={`Delete ${name}`}
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function Submissions({
  candidate,
  partners,
  editable,
}: {
  candidate: CandidateRow;
  partners: { id: string; name: string }[];
  editable: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveApplication, {});
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="border-t border-navy-900/10 bg-slate-50/60 p-5">
      {candidate.applications.length ? (
        <ul className="mb-4 space-y-2">
          {candidate.applications.map((application) => (
            <li
              key={application.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-900/10 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-navy-900">
                  {application.role} <span className="text-slate-400">at</span> {application.partnerName}
                </p>
                <p className="text-xs text-slate-500">
                  {[
                    application.interviewAt ? `Interview ${formatDate(application.interviewAt)}` : "",
                    application.offerCtc ? `Offer ${formatMoney(application.offerCtc)}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No interview booked yet"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge tone={STAGE_TONE[application.stage] ?? "neutral"}>{pretty(application.stage)}</Badge>
                {editable ? (
                  <>
                    <form
                      action={setApplicationStage.bind(null, application.id)}
                      className="flex items-center gap-1.5"
                    >
                      <select
                        name="stage"
                        defaultValue={application.stage}
                        aria-label={`Stage for ${application.role}`}
                        className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {pretty(s)}
                          </option>
                        ))}
                      </select>
                      <input
                        name="interviewAt"
                        type="date"
                        aria-label="Interview date"
                        className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                      />
                      <input
                        name="offerCtc"
                        type="number"
                        min={0}
                        placeholder="Offer ₹"
                        aria-label="Offer CTC"
                        className="w-24 rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                      >
                        Update
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={() => startTransition(() => void deleteApplication(application.id))}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ${application.role} at ${application.partnerName}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-slate-500">Not sent to any partner yet.</p>
      )}

      {editable ? (
        partners.length ? (
          <form ref={formRef} action={action} className="flex flex-wrap items-end gap-2">
            {state.error ? (
              <div className="w-full">
                <Alert tone="error">{state.error}</Alert>
              </div>
            ) : null}
            <input type="hidden" name="candidateId" value={candidate.id} />
            <select name="partnerId" required defaultValue="" aria-label="Partner" className={cn(inputClass, "w-auto")}>
              <option value="">Select partner</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input name="role" required placeholder="Role" aria-label="Role" className={cn(inputClass, "w-44")} />
            <input name="sentAt" type="date" aria-label="Sent on" className={cn(inputClass, "w-40")} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Send className="size-4" aria-hidden /> Put forward
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-500">
            Add a company under{" "}
            <Link href="/admin/placements/partners" className="font-medium text-navy-900 underline">
              placement partners
            </Link>{" "}
            first.
          </p>
        )
      ) : null}
    </div>
  );
}

function CandidateForm({ candidate, onDone }: { candidate: CandidateRow | null; onDone: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCandidate, {});
  const [source, setSource] = useState<"ACADEMY" | "EXTERNAL">(candidate?.source ?? "EXTERNAL");

  // Closing on success is state, so it is adjusted during render.
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.ok) onDone();
  }

  return (
    <Card title={candidate ? `Edit ${candidate.name}` : "Add candidate"} className="mb-6">
      <form action={action} className="space-y-4">
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        {candidate ? <input type="hidden" name="id" value={candidate.id} /> : null}

        <div className="grid gap-3 sm:grid-cols-12">
          <input name="name" required placeholder="Full name" defaultValue={candidate?.name} className={`${inputClass} sm:col-span-4`} />
          <input name="email" type="email" placeholder="Email" defaultValue={candidate?.email} className={`${inputClass} sm:col-span-4`} />
          <input name="phone" placeholder="Phone" defaultValue={candidate?.phone} className={`${inputClass} sm:col-span-4`} />

          <select
            name="source"
            value={source}
            onChange={(e) => setSource(e.target.value as "ACADEMY" | "EXTERNAL")}
            aria-label="Where they came from"
            className={`${inputClass} sm:col-span-3`}
          >
            <option value="EXTERNAL">Outside applicant</option>
            <option value="ACADEMY">Our academy student</option>
          </select>

          {source === "ACADEMY" ? (
            <>
              <input name="course" placeholder="Course" defaultValue={candidate?.course} className={`${inputClass} sm:col-span-3`} />
              <input name="batch" placeholder="Batch" defaultValue={candidate?.batch} className={`${inputClass} sm:col-span-3`} />
            </>
          ) : (
            <input
              name="qualification"
              placeholder="Qualification"
              defaultValue={candidate?.qualification}
              className={`${inputClass} sm:col-span-6`}
            />
          )}
          <input name="city" placeholder="City" defaultValue={candidate?.city} className={`${inputClass} sm:col-span-3`} />

          <input
            name="experienceYears"
            type="number"
            min={0}
            placeholder="Years of experience"
            defaultValue={candidate?.experienceYears}
            className={`${inputClass} sm:col-span-3`}
          />
          <input
            name="currentCtc"
            type="number"
            min={0}
            placeholder="Current CTC ₹"
            className={`${inputClass} sm:col-span-3`}
          />
          <input
            name="expectedCtc"
            type="number"
            min={0}
            placeholder="Expected CTC ₹"
            defaultValue={candidate?.expectedCtc || undefined}
            className={`${inputClass} sm:col-span-3`}
          />
          <input
            name="noticeDays"
            type="number"
            min={0}
            placeholder="Notice period (days)"
            defaultValue={candidate?.noticeDays}
            className={`${inputClass} sm:col-span-3`}
          />

          <div className="sm:col-span-12">
            <span className="mb-1.5 block text-sm font-medium text-navy-900">Skills</span>
            <TagListInput name="skills" defaultValue={candidate?.skills ?? []} placeholder="e.g. React" />
          </div>

          <div className="sm:col-span-6">
            <span className="mb-1.5 block text-sm font-medium text-navy-900">CV</span>
            <FileInput
              name="resumeUrl"
              nameField="resumeName"
              defaultValue={candidate?.resumeUrl}
              defaultName={candidate?.resumeName}
              folder="resumes"
              label="Upload CV"
            />
          </div>

          <div className="space-y-3 sm:col-span-6">
            <input
              name="portfolioUrl"
              placeholder="Portfolio / GitHub link"
              defaultValue={candidate?.portfolioUrl}
              className={inputClass}
            />
            <input
              name="linkedinUrl"
              placeholder="LinkedIn link"
              defaultValue={candidate?.linkedinUrl}
              className={inputClass}
            />
            <div className="grid grid-cols-2 gap-3">
              <select name="status" defaultValue={candidate?.status ?? "NEW"} aria-label="Status" className={inputClass}>
                {CANDIDATE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {pretty(s)}
                  </option>
                ))}
              </select>
              <select name="rating" defaultValue={String(candidate?.rating ?? 3)} aria-label="Rating" className={inputClass}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            name="notes"
            rows={2}
            placeholder="Notes"
            defaultValue={candidate?.notes ?? ""}
            className={`${inputClass} sm:col-span-12`}
          />
        </div>

        <div className="flex gap-3">
          <SubmitButton>{candidate ? "Update candidate" : "Save candidate"}</SubmitButton>
          <button
            type="button"
            onClick={onDone}
            className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-medium text-navy-800 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
