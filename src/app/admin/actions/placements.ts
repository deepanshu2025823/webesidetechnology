"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity, requirePermission } from "@/lib/auth";
import type { ActionState } from "@/app/admin/actions/collections";

export type { ActionState };

/**
 * Candidates and the companies they are put in front of.
 *
 * Academy students and outside applicants are the same record type — `source`
 * is the only difference — so both go through one pipeline, one CV store and
 * one set of letters.
 */

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string, fallback = 0) => {
  const raw = str(f, k).replace(/,/g, "");
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
const date = (f: FormData, k: string) => {
  const raw = str(f, k);
  return raw ? new Date(raw) : null;
};

const CANDIDATE_STATUSES = ["NEW", "SHORTLISTED", "IN_PROCESS", "PLACED", "ON_HOLD", "REJECTED"] as const;
const STAGES = ["SENT", "SHORTLISTED", "INTERVIEW", "OFFERED", "PLACED", "REJECTED", "WITHDRAWN"] as const;

type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];
type Stage = (typeof STAGES)[number];

const asStatus = (value: string): CandidateStatus =>
  (CANDIDATE_STATUSES as readonly string[]).includes(value) ? (value as CandidateStatus) : "NEW";

const asStage = (value: string): Stage =>
  (STAGES as readonly string[]).includes(value) ? (value as Stage) : "SENT";

/** Skills arrive from TagListInput as a JSON array. */
function skills(form: FormData): string[] {
  const raw = str(form, "skills");
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    // A plain comma-separated list is a reasonable thing for someone to type.
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

function refresh() {
  revalidatePath("/admin/placements");
}

// ---------------------------------------------------------------- candidates

export async function saveCandidate(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("placements", "write");
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return { error: "The candidate needs a name." };

  const email = str(form, "email").toLowerCase();
  const phone = str(form, "phone");
  if (!email && !phone) return { error: "Add an email or a phone number — a CV with no way to reach them is no use." };

  const data = {
    name,
    email,
    phone,
    city: str(form, "city"),
    source: (str(form, "source") === "ACADEMY" ? "ACADEMY" : "EXTERNAL") as "ACADEMY" | "EXTERNAL",
    course: str(form, "course"),
    batch: str(form, "batch"),
    qualification: str(form, "qualification"),
    skills: skills(form),
    experienceYears: Math.max(0, int(form, "experienceYears")),
    currentCtc: Math.max(0, int(form, "currentCtc")),
    expectedCtc: Math.max(0, int(form, "expectedCtc")),
    noticeDays: Math.max(0, int(form, "noticeDays")),
    resumeUrl: str(form, "resumeUrl"),
    resumeName: str(form, "resumeName"),
    portfolioUrl: str(form, "portfolioUrl"),
    linkedinUrl: str(form, "linkedinUrl"),
    status: asStatus(str(form, "status")),
    rating: Math.max(1, Math.min(5, int(form, "rating", 3))),
    notes: str(form, "notes") || null,
  };

  try {
    if (id) {
      await prisma.candidate.update({ where: { id }, data });
    } else {
      await prisma.candidate.create({ data: { ...data, ownerId: session.id } });
    }
  } catch (error) {
    console.error("[placements] saveCandidate", error);
    return { error: "Could not save this candidate." };
  }

  await logActivity(session.id, id ? "update" : "create", "Candidate", id || undefined, name);
  refresh();
  return { ok: true, message: "Candidate saved." };
}

export async function setCandidateStatus(id: string, form: FormData): Promise<void> {
  const session = await requirePermission("placements", "write");
  await prisma.candidate.update({ where: { id }, data: { status: asStatus(str(form, "status")) } });
  await logActivity(session.id, "update", "Candidate", id, str(form, "status"));
  refresh();
}

export async function deleteCandidate(id: string): Promise<void> {
  const session = await requirePermission("placements", "write");
  // Letters outlive the candidate record, so they are unlinked rather than lost.
  await prisma.hrLetter.updateMany({ where: { candidateId: id }, data: { candidateId: null } });
  await prisma.placementApplication.deleteMany({ where: { candidateId: id } });
  await prisma.candidate.delete({ where: { id } });
  await logActivity(session.id, "delete", "Candidate", id);
  refresh();
}

// -------------------------------------------------------------- applications

export async function saveApplication(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("placements", "write");
  const candidateId = str(form, "candidateId");
  const partnerId = str(form, "partnerId");
  const role = str(form, "role");

  if (!candidateId || !partnerId) return { error: "Pick a candidate and a partner." };
  if (!role) return { error: "Name the role they are being put forward for." };

  try {
    await prisma.placementApplication.create({
      data: {
        candidateId,
        partnerId,
        role,
        stage: asStage(str(form, "stage")),
        sentAt: date(form, "sentAt") ?? new Date(),
        interviewAt: date(form, "interviewAt"),
        feedback: str(form, "feedback") || null,
      },
    });
  } catch (error) {
    console.error("[placements] saveApplication", error);
    return { error: "That candidate has already been sent to this partner for this role." };
  }

  // Being put forward is progress; the candidate row should say so.
  await prisma.candidate.updateMany({
    where: { id: candidateId, status: { in: ["NEW", "SHORTLISTED"] } },
    data: { status: "IN_PROCESS" },
  });

  await logActivity(session.id, "create", "PlacementApplication", undefined, role);
  refresh();
  return { ok: true, message: "Candidate put forward." };
}

/**
 * Moves one application along. An offer accepted marks the candidate placed —
 * the two would otherwise drift apart, and the candidate list is what the team
 * reads day to day.
 */
export async function setApplicationStage(id: string, form: FormData): Promise<void> {
  const session = await requirePermission("placements", "write");
  const stage = asStage(str(form, "stage"));
  const offerCtc = int(form, "offerCtc");

  const application = await prisma.placementApplication.update({
    where: { id },
    data: {
      stage,
      ...(offerCtc > 0 ? { offerCtc } : {}),
      ...(str(form, "interviewAt") ? { interviewAt: date(form, "interviewAt") } : {}),
      ...(str(form, "feedback") ? { feedback: str(form, "feedback") } : {}),
      ...(stage === "PLACED" ? { joinedAt: date(form, "joinedAt") ?? new Date() } : {}),
    },
  });

  if (stage === "PLACED") {
    await prisma.candidate.update({ where: { id: application.candidateId }, data: { status: "PLACED" } });
  }

  await logActivity(session.id, "update", "PlacementApplication", id, stage);
  refresh();
}

export async function deleteApplication(id: string): Promise<void> {
  const session = await requirePermission("placements", "write");
  await prisma.placementApplication.delete({ where: { id } });
  await logActivity(session.id, "delete", "PlacementApplication", id);
  refresh();
}
