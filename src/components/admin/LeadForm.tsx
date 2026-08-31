"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { createLead, type ActionState } from "@/app/admin/actions/crm";
import { Alert, Card, FieldWrap, SubmitButton, inputClass } from "@/components/admin/ui";
import { personLabel, type Person } from "@/components/admin/people";

const STAGES = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

const SOURCES = ["manual", "phone", "walk-in", "referral", "whatsapp", "instagram", "facebook", "linkedin", "event", "cold-call"];

const BUDGETS = [
  "Under ₹50,000",
  "₹50,000 – ₹2 lakh",
  "₹2 – ₹5 lakh",
  "₹5 – ₹10 lakh",
  "Above ₹10 lakh",
  "Not sure yet",
];

/** Manual lead entry — phone enquiries, walk-ins and referrals. */
export function LeadForm({ owners, services }: { owners: Person[]; services: string[] }) {
  const [state, action] = useActionState<ActionState, FormData>(createLead, {});

  return (
    <form action={action} className="space-y-6">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Who got in touch">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrap label="Name" htmlFor="name" required className="sm:col-span-2">
                <input id="name" name="name" required autoFocus className={inputClass} placeholder="Rohit Sharma" />
              </FieldWrap>

              <FieldWrap label="Email" htmlFor="email" help="Email or phone — at least one is needed.">
                <input id="email" name="email" type="email" className={inputClass} placeholder="rohit@acme.in" />
              </FieldWrap>

              <FieldWrap label="Phone" htmlFor="phone">
                <input id="phone" name="phone" inputMode="tel" className={inputClass} placeholder="+91 98765 43210" />
              </FieldWrap>

              <FieldWrap label="Company" htmlFor="company" className="sm:col-span-2">
                <input id="company" name="company" className={inputClass} placeholder="Acme Pvt Ltd" />
              </FieldWrap>
            </div>
          </Card>

          <Card title="What they want">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrap label="Service interest" htmlFor="serviceInterest">
                <input
                  id="serviceInterest"
                  name="serviceInterest"
                  list="lead-services"
                  className={inputClass}
                  placeholder="Web Development"
                />
                <datalist id="lead-services">
                  {services.map((service) => (
                    <option key={service} value={service} />
                  ))}
                </datalist>
              </FieldWrap>

              <FieldWrap label="Budget" htmlFor="budget">
                <input id="budget" name="budget" list="lead-budgets" className={inputClass} placeholder="₹2 – ₹5 lakh" />
                <datalist id="lead-budgets">
                  {BUDGETS.map((budget) => (
                    <option key={budget} value={budget} />
                  ))}
                </datalist>
              </FieldWrap>

              <FieldWrap label="Requirement / notes" htmlFor="message" className="sm:col-span-2">
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className={inputClass}
                  placeholder="What they asked for, and anything worth remembering before the next call."
                />
              </FieldWrap>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Pipeline">
            <div className="space-y-5">
              <FieldWrap label="Stage" htmlFor="status">
                <select id="status" name="status" defaultValue="NEW" className={inputClass}>
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Owner" htmlFor="ownerId" help="Who follows this up.">
                <select id="ownerId" name="ownerId" defaultValue="" className={inputClass}>
                  <option value="">— Unassigned —</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {personLabel(o)}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Next follow-up" htmlFor="nextFollowUpAt">
                <input id="nextFollowUpAt" name="nextFollowUpAt" type="date" className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Score" htmlFor="score" help="0–100. Above 70 flags the lead as hot.">
                <input id="score" name="score" type="number" min={0} max={100} defaultValue={0} className={inputClass} />
              </FieldWrap>
            </div>
          </Card>

          <Card title="Source">
            <FieldWrap label="Where it came from" htmlFor="source">
              <input id="source" name="source" list="lead-sources" defaultValue="manual" className={inputClass} />
              <datalist id="lead-sources">
                {SOURCES.map((source) => (
                  <option key={source} value={source} />
                ))}
              </datalist>
            </FieldWrap>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-navy-900/10 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <SubmitButton icon={<UserPlus className="size-4" aria-hidden />}>Create lead</SubmitButton>
      </div>
    </form>
  );
}
