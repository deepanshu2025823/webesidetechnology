import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const MAX_BYTES = 8 * 1024 * 1024;
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
 * Admin-only image upload. Raster images are re-encoded to WebP so the site
 * ships small files no matter what the client drops in.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });

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
    width = meta.width ?? null;
    height = meta.height ?? null;

    output = await image
      .resize({ width: Math.min(meta.width ?? 2000, 2000), withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    filename = `${base}-${stamp}.webp`;
    mimeType = "image/webp";

    const resized = await sharp(output).metadata();
    width = resized.width ?? width;
    height = resized.height ?? height;
  }

  await writeFile(path.join(dir, filename), output);
  const url = `/uploads/${folder}/${filename}`;

  const media = await prisma.media.create({
    data: {
      filename,
      url,
      mimeType,
      size: output.length,
      width,
      height,
      alt,
      folder,
      uploadedById: session.id,
    },
  });

  return NextResponse.json({ url, media });
}
