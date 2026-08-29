import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { DocumentManager } from "@/components/admin/DocumentManager";

export default async function DocumentsPage() {
  const session = await requireModule("documents");

  const [documents, clients, projects, services] = await Promise.all([
    // Superseded versions point at their replacement, so only current files list.
    prisma.document.findMany({
      where: { replacesId: null },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true } },
        project: { select: { name: true } },
        uploadedBy: { select: { name: true } },
      },
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.clientProject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ select: { id: true, title: true }, orderBy: { order: "asc" } }),
  ]);

  const editable = canEdit(session.role, "documents");

  return (
    <>
      <PageHeader
        title="Documents"
        description="Contracts, proposals, briefs, creatives and handover files, filed by client and project."
      />

      {documents.length === 0 && !editable ? (
        <EmptyState title="No documents yet" description="Files uploaded by the team appear here." />
      ) : (
        <DocumentManager
          editable={editable}
          clients={clients}
          projects={projects}
          services={services}
          rows={documents.map((d) => ({
            id: d.id,
            name: d.name,
            url: d.url,
            category: d.category,
            version: d.version,
            size: d.size,
            isClientVisible: d.isClientVisible,
            clientName: d.client?.name ?? null,
            projectName: d.project?.name ?? null,
            uploadedBy: d.uploadedBy?.name ?? null,
            createdAt: d.createdAt.toISOString(),
          }))}
        />
      )}
    </>
  );
}
