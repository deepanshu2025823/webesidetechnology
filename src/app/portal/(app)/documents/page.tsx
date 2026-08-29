import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/portal-auth";
import { formatDate } from "@/lib/utils";

export default async function PortalDocumentsPage() {
  const session = await requirePortalSession();

  const documents = await prisma.document.findMany({
    // Only files the team explicitly shared are visible here.
    where: { clientId: session.clientId, isClientVisible: true, replacesId: null },
    orderBy: { createdAt: "desc" },
    include: { project: { select: { name: true } } },
  });

  return (
    <>
      <h1 className="text-2xl font-semibold text-navy-900">Documents</h1>
      <p className="mt-1 text-sm text-slate-500">Contracts, proposals, reports and handover files shared with you.</p>

      {documents.length ? (
        <ul className="mt-6 divide-y divide-navy-900/5 rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-5 py-4">
              <FileText className="size-4 shrink-0 text-slate-400" aria-hidden />
              <span className="min-w-0 flex-1">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium text-navy-900 hover:text-gold-700"
                >
                  {doc.name}
                </a>
                <span className="block text-xs text-slate-500">
                  {doc.category}
                  {doc.project ? ` · ${doc.project.name}` : ""} · {formatDate(doc.createdAt)}
                </span>
              </span>
              <a
                href={doc.url}
                download
                className="shrink-0 rounded-lg border border-navy-900/15 px-3 py-1.5 text-xs font-medium text-navy-800 hover:bg-slate-50"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-navy-900/20 bg-white px-6 py-10 text-center text-sm text-slate-500">
          Nothing shared with you yet.
        </p>
      )}
    </>
  );
}
