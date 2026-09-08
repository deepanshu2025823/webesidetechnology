"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { FileSignature, Printer, Trash2 } from "lucide-react";
import { deleteLetter, saveLetter, setLetterStatus, type ActionState } from "@/app/admin/actions/hr";
import { Alert, Badge, Card, EmptyState, SubmitButton, inputClass } from "@/components/admin/ui";
import { LETTER_TYPES, amountLabel, type LetterType } from "@/lib/letters";
import { formatDate } from "@/lib/utils";

export type LetterRow = {
  id: string;
  refNo: string;
  type: string;
  personName: string;
  designation: string;
  department: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  issuedAt: string;
  issuedBy: string | null;
};

type Person = { id: string; name: string; designation?: string; department?: string };

const TONE = { DRAFT: "muted", ISSUED: "success", REVOKED: "warn" } as const;
const TYPE_LABELS = Object.fromEntries(LETTER_TYPES.map((t) => [t.value, t.label]));

/**
 * Issues and keeps every letter HR sends out.
 *
 * The wording is generated from the record, so an experience certificate reads
 * the same however many are issued; whoever needs different words types them
 * into "custom wording" and the rest of the letterhead still applies.
 */
export function LetterManager({
  rows,
  employees,
  candidates,
  editable,
}: {
  rows: LetterRow[];
  employees: Person[];
  candidates: Person[];
  editable: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveLetter, {});
  const [issuing, setIssuing] = useState(false);
  const [type, setType] = useState<LetterType>("EXPERIENCE");
  const [about, setAbout] = useState<"employee" | "candidate" | "other">("employee");
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.ok) setIssuing(false);
  }

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <>
      {editable ? (
        issuing ? (
          <Card title="Issue a letter" className="mb-6">
            <form ref={formRef} action={action} className="space-y-4">
              {state.error ? <Alert tone="error">{state.error}</Alert> : null}

              <div className="grid gap-3 sm:grid-cols-12">
                <label className="sm:col-span-4">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Letter type</span>
                  <select
                    name="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as LetterType)}
                    className={inputClass}
                  >
                    {LETTER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="sm:col-span-4">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Who is it for</span>
                  <select
                    value={about}
                    onChange={(e) => setAbout(e.target.value as typeof about)}
                    className={inputClass}
                    aria-label="Who the letter is for"
                  >
                    <option value="employee">An employee</option>
                    <option value="candidate">A placement candidate</option>
                    <option value="other">Someone else</option>
                  </select>
                </label>

                {about === "employee" ? (
                  <label className="sm:col-span-4">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Employee</span>
                    <select name="employeeId" required defaultValue="" className={inputClass}>
                      <option value="">Select employee</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : about === "candidate" ? (
                  <label className="sm:col-span-4">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Candidate</span>
                    <select name="candidateId" required defaultValue="" className={inputClass}>
                      <option value="">Select candidate</option>
                      {candidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="sm:col-span-4">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Name</span>
                    <input name="personName" required placeholder="Full name" className={inputClass} />
                  </label>
                )}

                <input
                  name="designation"
                  placeholder="Designation on the letter"
                  className={`${inputClass} sm:col-span-4`}
                />
                <input name="department" placeholder="Department" className={`${inputClass} sm:col-span-4`} />
                <input name="personEmail" type="email" placeholder="Email" className={`${inputClass} sm:col-span-4`} />

                <label className="sm:col-span-3">
                  <span className="mb-1 block text-xs font-medium text-slate-600">From</span>
                  <input name="startDate" type="date" className={inputClass} />
                </label>
                <label className="sm:col-span-3">
                  <span className="mb-1 block text-xs font-medium text-slate-600">To</span>
                  <input name="endDate" type="date" className={inputClass} />
                </label>
                <label className="sm:col-span-3">
                  <span className="mb-1 block text-xs font-medium text-slate-600">{amountLabel(type)}</span>
                  <input name="amount" type="number" min={0} placeholder="₹" className={inputClass} />
                </label>
                <label className="sm:col-span-3">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Dated</span>
                  <input name="issuedAt" type="date" className={inputClass} />
                </label>

                <input
                  name="personAddress"
                  placeholder="Address (printed under the name)"
                  className={`${inputClass} sm:col-span-6`}
                />
                <input name="place" placeholder="Place (e.g. Faridabad)" className={`${inputClass} sm:col-span-3`} />
                <select name="status" defaultValue="ISSUED" aria-label="Status" className={`${inputClass} sm:col-span-3`}>
                  <option value="DRAFT">Draft</option>
                  <option value="ISSUED">Issued</option>
                </select>

                <input name="signatoryName" placeholder="Signed by" className={`${inputClass} sm:col-span-6`} />
                <input
                  name="signatoryRole"
                  placeholder="Their designation"
                  className={`${inputClass} sm:col-span-6`}
                />

                <textarea
                  name="remarks"
                  rows={2}
                  placeholder="Extra paragraph, added after the standard wording (optional)"
                  className={`${inputClass} sm:col-span-12`}
                />
                <textarea
                  name="bodyOverride"
                  rows={4}
                  placeholder="Custom wording — replaces the standard text entirely. Leave blank to use the generated letter. Separate paragraphs with a blank line."
                  className={`${inputClass} sm:col-span-12`}
                />
              </div>

              <div className="flex gap-3">
                <SubmitButton>Save letter</SubmitButton>
                <button
                  type="button"
                  onClick={() => setIssuing(false)}
                  className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-medium text-navy-800 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        ) : (
          <button
            type="button"
            onClick={() => setIssuing(true)}
            className="mb-6 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <FileSignature className="size-4" aria-hidden /> Issue a letter
          </button>
        )
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No letters issued yet"
          description="Offer, internship, experience, relieving, confirmation and appreciation letters — issued here, numbered automatically and printed on the company letterhead."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Person</th>
                  <th className="px-5 py-3 font-medium">Period</th>
                  <th className="px-5 py-3 font-medium">Dated</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Letter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{row.refNo}</td>
                    <td className="px-5 py-3.5 text-navy-900">{TYPE_LABELS[row.type] ?? row.type}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-navy-900">{row.personName}</span>
                      {row.designation ? (
                        <span className="block text-xs text-slate-500">
                          {[row.designation, row.department].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {row.startDate
                        ? `${formatDate(row.startDate)}${row.endDate ? ` – ${formatDate(row.endDate)}` : ""}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(row.issuedAt)}</td>
                    <td className="px-5 py-3.5">
                      {editable ? (
                        <form
                          action={setLetterStatus.bind(null, row.id)}
                          onChange={(e) => startTransition(() => (e.currentTarget as HTMLFormElement).requestSubmit())}
                        >
                          <select
                            name="status"
                            defaultValue={row.status}
                            aria-label={`Status for ${row.refNo}`}
                            className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                          >
                            {["DRAFT", "ISSUED", "REVOKED"].map((s) => (
                              <option key={s} value={s}>
                                {s.charAt(0) + s.slice(1).toLowerCase()}
                              </option>
                            ))}
                          </select>
                        </form>
                      ) : (
                        <Badge tone={TONE[row.status as keyof typeof TONE] ?? "neutral"}>
                          {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/print/letter/${row.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-navy-900/15 px-3 py-1.5 text-xs font-medium text-navy-800 hover:border-gold-500 hover:bg-gold-50"
                        >
                          <Printer className="size-3.5" aria-hidden /> Print
                        </Link>
                        {editable ? (
                          <button
                            type="button"
                            onClick={() => startTransition(() => void deleteLetter(row.id))}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Delete ${row.refNo}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
