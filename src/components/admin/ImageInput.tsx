"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { inputClass } from "@/components/admin/ui";

/** Upload-or-paste image field. Stores the resulting URL in a hidden input. */
export function ImageInput({
  name,
  defaultValue = "",
  folder = "uploads",
}: {
  name: string;
  defaultValue?: string | null;
  folder?: string;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={url} />

      <div className="flex items-start gap-4">
        <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-navy-900/15 bg-slate-50">
          {url ? (
            <Image src={url} alt="" fill sizes="96px" className="object-contain p-1.5" />
          ) : (
            <ImagePlus className="size-6 text-slate-300" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-900/15 px-3 py-2 text-xs font-medium text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
              {busy ? "Uploading…" : "Upload image"}
            </button>
            {url ? (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="inline-flex items-center gap-2 rounded-lg border border-navy-900/15 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
              >
                <Trash2 className="size-3.5" /> Remove
              </button>
            ) : null}
          </div>

          {/*
            Deliberately type="text": uploads are stored as site-relative paths
            such as /uploads/brand/logo.png, which fail type="url" validation
            and would silently block the whole form from submitting.
          */}
          <input
            type="text"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="…or paste an image URL / path"
            className={inputClass}
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
