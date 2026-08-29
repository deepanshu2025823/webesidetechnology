"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";

/** Multi-image picker serialised to a hidden JSON input. */
export function GalleryInput({ name, defaultValue = [] }: { name: string; defaultValue?: string[] }) {
  const [urls, setUrls] = useState<string[]>(Array.isArray(defaultValue) ? defaultValue : []);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList) {
    setBusy(true);
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "portfolio");
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (res.ok && data.url) setUrls((prev) => [...prev, data.url]);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(urls)} />

      {urls.length ? (
        <ul className="grid grid-cols-3 gap-3">
          {urls.map((url, i) => (
            <li key={`${url}-${i}`} className="group relative aspect-video overflow-hidden rounded-lg border border-navy-900/10 bg-slate-50">
              <Image src={url} alt="" fill sizes="160px" className="object-cover" />
              <button
                type="button"
                onClick={() => setUrls((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-navy-950/80 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-navy-900/25 px-4 py-3 text-sm font-medium text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        {busy ? "Uploading…" : "Add images"}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void upload(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
