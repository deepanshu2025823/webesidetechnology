import { prisma } from "@/lib/prisma";

/**
 * Serves a file uploaded through the admin panel.
 *
 * Uploads live in the database rather than on disk, so this is the only way
 * their bytes reach the browser. The id is content-stable - a row's bytes never
 * change once written - so the response is immutable and both the CDN and
 * Next's image optimiser can hold on to it indefinitely.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const media = await prisma.media.findUnique({
    where: { id },
    select: { data: true, mimeType: true, filename: true },
  });

  if (!media?.data) return new Response("Not found", { status: 404 });

  return new Response(media.data, {
    headers: {
      "Content-Type": media.mimeType || "application/octet-stream",
      "Content-Length": String(media.data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      // Inline for images the browser can render; the filename is kept so a
      // deliberate download lands with the name the editor uploaded.
      "Content-Disposition": `inline; filename="${encodeURIComponent(media.filename)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
