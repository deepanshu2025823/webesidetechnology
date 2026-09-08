import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { agencyForPrint } from "@/components/admin/print-details";
import { getSettings } from "@/lib/queries";
import { LETTER_TITLES, letterBody, letterSalutation, type LetterType } from "@/lib/letters";
import { formatDate } from "@/lib/utils";

/**
 * One letter, on the company letterhead, ready for "Save as PDF".
 *
 * The agency's details are read live from settings — the same way invoices and
 * quotations do it — so a reprint always carries the current address and
 * branding rather than a copy frozen when the letter was raised.
 */
export default async function PrintLetterPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("team");
  const { id } = await params;

  const [letter, settings] = await Promise.all([prisma.hrLetter.findUnique({ where: { id } }), getSettings()]);
  if (!letter) notFound();

  const agency = agencyForPrint(settings);
  const type = letter.type as LetterType;

  const paragraphs = letterBody({
    type,
    personName: letter.personName,
    designation: letter.designation,
    department: letter.department,
    startDate: letter.startDate,
    endDate: letter.endDate,
    amount: letter.amount,
    company: agency.name,
    remarks: letter.remarks,
    bodyOverride: letter.bodyOverride,
  });

  return (
    <div className="mx-auto max-w-[820px] bg-white p-10 text-navy-900 print:mx-0 print:max-w-none print:px-[16mm] print:py-[14mm]">
      {/*
        `margin: 0` stops Chrome and Edge printing their own header and footer —
        the page URL that would otherwise appear under every letter. The page
        padding above replaces the margin the browser would have added.
      */}
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { background: #fff; }
          .print-block { break-inside: avoid; }
        }
      `}</style>

      <header className="flex items-start justify-between gap-8 border-b-2 border-gold-600 pb-6">
        <div>
          <Image src={agency.logo} alt={agency.name} width={1024} height={390} className="h-20 w-auto" />
          <p className="mt-3 font-display text-lg">{agency.name}</p>
          {agency.address ? <p className="text-xs text-slate-600">{agency.address}</p> : null}
          <p className="text-xs text-slate-600">{[agency.email, agency.phone].filter(Boolean).join(" · ")}</p>
        </div>

        <div className="text-right text-xs text-slate-600">
          <p className="font-mono">{letter.refNo}</p>
          <p className="mt-1">Date: {formatDate(letter.issuedAt)}</p>
          {letter.status === "DRAFT" ? (
            <p className="mt-2 inline-block rounded border border-navy-900/20 px-2 py-0.5 uppercase tracking-wide">
              Draft
            </p>
          ) : null}
        </div>
      </header>

      <h1 className="mt-10 text-center font-display text-2xl uppercase tracking-[0.12em] text-navy-900">
        {LETTER_TITLES[type] ?? "Letter"}
      </h1>
      <p aria-hidden className="mx-auto mt-2 h-0.5 w-24 bg-gold-600" />

      <div className="mt-10">
        <p className="font-medium">{letterSalutation(type, letter.personName)}</p>
        {letter.personAddress ? (
          <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{letter.personAddress}</p>
        ) : null}
      </div>

      <div className="mt-6 space-y-4 text-[15px] leading-[1.85]">
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <div className="print-block mt-16 flex items-end justify-between gap-8">
        <div className="text-sm">
          <p className="font-medium">For {agency.name}</p>
          <div className="mt-14 border-t border-navy-900/30 pt-2">
            <p className="font-medium">{letter.signatoryName || "Authorised signatory"}</p>
            {letter.signatoryRole ? <p className="text-xs text-slate-600">{letter.signatoryRole}</p> : null}
          </div>
        </div>

        <div className="text-right text-xs text-slate-600">
          {letter.place ? <p>Place: {letter.place}</p> : null}
          <p>Date: {formatDate(letter.issuedAt)}</p>
        </div>
      </div>

      <p className="mt-12 border-t border-navy-900/10 pt-4 text-center text-[10px] text-slate-400">
        This is a computer-generated letter issued under reference {letter.refNo}. Its authenticity may be verified with{" "}
        {agency.name}
        {agency.email ? ` at ${agency.email}` : ""}.
      </p>
    </div>
  );
}
