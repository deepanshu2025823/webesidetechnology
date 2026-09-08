/**
 * Wording for the letters HR issues.
 *
 * The text is generated from the record rather than stored as a blob, so a
 * letter reprinted a year later still reads correctly and every letter of the
 * same type is worded identically. `bodyOverride` is the escape hatch for the
 * cases that need their own wording, and `remarks` adds a paragraph without
 * throwing the rest away.
 */

export type LetterType = "OFFER" | "INTERNSHIP" | "EXPERIENCE" | "RELIEVING" | "CONFIRMATION" | "APPRECIATION";

export const LETTER_TYPES: { value: LetterType; label: string; prefix: string }[] = [
  { value: "OFFER", label: "Offer letter", prefix: "OFR" },
  { value: "INTERNSHIP", label: "Internship letter", prefix: "INT" },
  { value: "EXPERIENCE", label: "Experience letter", prefix: "EXP" },
  { value: "RELIEVING", label: "Relieving letter", prefix: "REL" },
  { value: "CONFIRMATION", label: "Confirmation letter", prefix: "CNF" },
  { value: "APPRECIATION", label: "Appreciation letter", prefix: "APR" },
];

export const LETTER_LABELS = Object.fromEntries(LETTER_TYPES.map((t) => [t.value, t.label])) as Record<
  LetterType,
  string
>;

/** The heading printed across the top of the page. */
export const LETTER_TITLES: Record<LetterType, string> = {
  OFFER: "Letter of Offer",
  INTERNSHIP: "Internship Certificate",
  EXPERIENCE: "Experience Certificate",
  RELIEVING: "Relieving Letter",
  CONFIRMATION: "Letter of Confirmation",
  APPRECIATION: "Letter of Appreciation",
};

/** Whether the amount on the record is a monthly stipend or an annual CTC. */
export function amountLabel(type: LetterType): string {
  return type === "INTERNSHIP" ? "Stipend (per month)" : "Annual CTC";
}

const day = (value: Date | null | undefined) =>
  value
    ? value.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "";

const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export type LetterFacts = {
  type: LetterType;
  personName: string;
  designation: string;
  department: string;
  startDate: Date | null;
  endDate: Date | null;
  amount: number | null;
  company: string;
  remarks?: string | null;
  bodyOverride?: string | null;
};

/**
 * The paragraphs of one letter, ready to print.
 *
 * Anything the record does not carry is simply left out of the sentence rather
 * than printed as a blank — a certificate with "from  to " on it is worse than
 * one that does not mention dates.
 */
export function letterBody(facts: LetterFacts): string[] {
  if (facts.bodyOverride?.trim()) {
    return facts.bodyOverride
      .trim()
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  const { personName: name, designation, department, company } = facts;
  const role = designation || "team member";
  const dept = department ? ` in the ${department} department` : "";
  const from = day(facts.startDate);
  const to = day(facts.endDate);
  const period = from && to ? `from ${from} to ${to}` : from ? `with effect from ${from}` : "";
  const paragraphs: string[] = [];

  switch (facts.type) {
    case "OFFER":
      paragraphs.push(
        `We are pleased to offer you the position of ${role}${dept} at ${company}.` +
          (from ? ` Your appointment is effective from ${from}.` : ""),
      );
      if (facts.amount) {
        paragraphs.push(
          `Your annual cost to company will be ${money(facts.amount)}, payable monthly and subject to statutory deductions.`,
        );
      }
      paragraphs.push(
        "This offer is made on the basis of the information you have provided and is subject to verification of your documents and references.",
      );
      paragraphs.push(
        "We look forward to welcoming you and are confident you will find the role both challenging and rewarding.",
      );
      break;

    case "INTERNSHIP":
      paragraphs.push(
        `This is to certify that ${name} has successfully completed an internship with ${company} as ${role}${dept}${period ? ` ${period}` : ""}.`,
      );
      if (facts.amount) {
        paragraphs.push(`A stipend of ${money(facts.amount)} per month was paid for the duration of the internship.`);
      }
      paragraphs.push(
        "During this period they worked on live assignments alongside our team, and we found their conduct, punctuality and willingness to learn to be commendable.",
      );
      paragraphs.push("We wish them every success in their future endeavours.");
      break;

    case "EXPERIENCE":
      paragraphs.push(
        `This is to certify that ${name} was employed with ${company} as ${role}${dept}${period ? ` ${period}` : ""}.`,
      );
      paragraphs.push(
        "During their tenure we found them to be sincere, diligent and professional in their dealings, and their conduct throughout was found to be satisfactory.",
      );
      paragraphs.push(
        "This certificate is issued at their request. We wish them every success in their future endeavours.",
      );
      break;

    case "RELIEVING":
      paragraphs.push(
        `This is to confirm that ${name}, ${role}${dept}, has been relieved from their duties at ${company}${to ? ` at the close of business on ${to}` : ""}.`,
      );
      paragraphs.push(
        "All dues have been settled and there are no outstanding obligations on either side as of the date of this letter.",
      );
      paragraphs.push("We thank them for their contribution and wish them well.");
      break;

    case "CONFIRMATION":
      paragraphs.push(
        `We are pleased to inform you that, following the successful completion of your probation, your appointment as ${role}${dept} at ${company} stands confirmed${from ? ` with effect from ${from}` : ""}.`,
      );
      paragraphs.push(
        "All other terms and conditions of your employment remain unchanged. We look forward to your continued contribution.",
      );
      break;

    case "APPRECIATION":
      paragraphs.push(
        `${company} would like to place on record its appreciation of ${name}, ${role}${dept}, for their outstanding contribution${period ? ` ${period}` : ""}.`,
      );
      paragraphs.push(
        "Their commitment, ownership and consistently high standard of work have made a real difference to the team and to our clients.",
      );
      break;
  }

  if (facts.remarks?.trim()) paragraphs.push(facts.remarks.trim());

  return paragraphs;
}

/** The salutation line, which differs between an offer and a certificate. */
export function letterSalutation(type: LetterType, name: string): string {
  return type === "OFFER" || type === "CONFIRMATION" ? `Dear ${name},` : "To whomsoever it may concern";
}
