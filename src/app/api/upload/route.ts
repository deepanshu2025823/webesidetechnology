import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Ceiling on what actually gets stored. TiDB rejects a transaction whose entry
 * exceeds 6 MiB, so a row above that would fail with an opaque driver error;
 * this turns it into a message an editor can act on. Re-encoded images land far
 * below it - the limit only really bites on large documents.
 */
const MAX_STORED_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml", "image/gif"]);

/** Documents accept the file types an agency actually exchanges with clients. */
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
]);

/**
 * Admin-only upload. Raster images are re-encoded to WebP so the site ships
 * small files no matter what the client drops in.
 *
 * Files are stored in the database and served by /api/media/[id] rather than
 * written under public/. Writing to disk worked in local development and failed
 * in production, where the filesystem is read-only and not shared between
 * invocations - one code path now behaves the same in both.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    const folder = slugify(String(form.get("folder") ?? "uploads")) || "uploads";
    const alt = String(form.get("alt") ?? "").slice(0, 300);

    if (!(file instanceof File)) return NextResponse.json({ error: "No file received" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File must be under 8 MB" }, { status: 400 });

    const isImage = IMAGE_TYPES.has(file.type);
    if (!isImage && !DOCUMENT_TYPES.has(file.type)) {
      return NextResponse.json({ error: "That file type is not accepted" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stamp = Date.now().toString(36);
    const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "image";

    let filename: string;
    let output: Buffer;
    let width: number | null = null;
    let height: number | null = null;
    let mimeType = file.type;

    if (!isImage) {
      // Documents are stored as-is; only rasters get re-encoded.
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      filename = `${base}-${stamp}.${extension}`;
      output = buffer;
    } else if (file.type === "image/svg+xml") {
      filename = `${base}-${stamp}.svg`;
      output = buffer;
    } else {
      const image = sharp(buffer, { animated: file.type === "image/gif" });
      const meta = await image.metadata();

      output = await image
        .resize({ width: Math.min(meta.width ?? 2000, 2000), withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      filename = `${base}-${stamp}.webp`;
      mimeType = "image/webp";

      const resized = await sharp(output).metadata();
      width = resized.width ?? meta.width ?? null;
      height = resized.height ?? meta.height ?? null;
    }

    if (output.length > MAX_STORED_BYTES) {
      return NextResponse.json(
        { error: "That file is too large to store. Please upload one under 5 MB." },
        { status: 400 },
      );
    }

    // The row is created first so its id can form the URL it is served from.
    const media = await prisma.media.create({
      // Everything but `data` - no reason to read the bytes back out again.
      select: {
        id: true, filename: true, url: true, mimeType: true,
        size: true, width: true, height: true, alt: true, folder: true, createdAt: true,
      },
      data: {
        filename,
        url: "",
        mimeType,
        size: output.length,
        // Prisma's Bytes maps to Uint8Array; Buffer's ArrayBufferLike does not fit it.
        data: Uint8Array.from(output),
        width,
        height,
        alt,
        folder,
        uploadedById: session.id,
      },
    });

    const url = `/api/media/${media.id}`;
    await prisma.media.update({ where: { id: media.id }, data: { url }, select: { id: true } });

    return NextResponse.json({ url, media: { ...media, url } });
  } catch (error) {
    // Without this the route returns an empty 500 body and the browser reports
    // "Unexpected end of JSON input", which tells an editor nothing.
    console.error("Upload failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
