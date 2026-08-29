import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit, type ModuleKey } from "@/lib/permissions";
import { COLLECTIONS, getCollection } from "@/lib/admin/collections";
import { CollectionManager } from "@/components/admin/CollectionManager";

type Params = { params: Promise<{ collection: string[] }> };

export function generateStaticParams() {
  return Object.keys(COLLECTIONS).map((collection) => ({ collection: collection.split("/") }));
}

/**
 * Every declarative collection renders through here. The slug may contain a
 * slash (hr/employees), so this is a catch-all rather than a single segment.
 */
export default async function CollectionPage({ params }: Params) {
  const { collection: segments } = await params;
  const slug = segments.join("/");
  const collection = getCollection(slug);
  if (!collection) notFound();

  const session = await requireModule((collection.module ?? "website") as ModuleKey);

  const delegate = (prisma as unknown as Record<string, { findMany: (args?: unknown) => Promise<unknown> }>)[
    collection.model
  ];
  const rows = (await delegate.findMany({
    orderBy: collection.orderBy ?? { id: "asc" },
  })) as (Record<string, unknown> & { id: string })[];

  // Menu links can nest, so offer existing top-level links as parents.
  const dynamicOptions: Record<string, { value: string; label: string }[]> = {};
  if (slug === "menus") {
    dynamicOptions.parentId = rows
      .filter((r) => !r.parentId)
      .map((r) => ({ value: r.id, label: `${r.label} (${String(r.location).replace("_", " ")})` }));
  }

  return (
    <CollectionManager
      collection={collection}
      rows={JSON.parse(JSON.stringify(rows))}
      dynamicOptions={dynamicOptions}
      readOnly={!canEdit(session.role, (collection.module ?? "website") as ModuleKey)}
    />
  );
}
