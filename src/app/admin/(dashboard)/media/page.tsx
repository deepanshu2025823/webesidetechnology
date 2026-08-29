import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { formatDate } from "@/lib/utils";

export default async function MediaPage() {
  // `data` holds the file bytes, so the listing must never select it - without
  // this the grid would pull every blob on the page into memory.
  const media = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, filename: true, url: true, alt: true,
      width: true, height: true, size: true, createdAt: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Media library"
        description="Everything uploaded through the admin panel. Images are converted to WebP automatically."
      />

      <MediaUploader />

      {media.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nothing uploaded yet" description="Drop images here or upload them from any content form." />
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-xl border border-navy-900/10 bg-white shadow-sm">
              <div className="relative aspect-video bg-slate-50">
                <Image src={item.url} alt={item.alt || item.filename} fill sizes="240px" className="object-contain p-2" />
              </div>
              <div className="border-t border-navy-900/5 p-3">
                <p className="truncate text-xs font-medium text-navy-900" title={item.filename}>
                  {item.filename}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                  {Math.round(item.size / 1024)} KB
                </p>
                <p className="text-[11px] text-slate-400">{formatDate(item.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
