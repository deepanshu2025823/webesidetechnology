"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function MediaUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: FileList | File[]) {
    setBusy(true);
    setError("");
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "library");
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Upload failed");
      }
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragging ? "border-gold-500 bg-gold-50" : "border-navy-900/20 bg-white hover:border-gold-400 hover:bg-gold-50/40",
        )}
      >
        {busy ? (
          <Loader2 className="mx-auto size-8 animate-spin text-gold-600" aria-hidden />
        ) : (
          <UploadCloud className="mx-auto size-8 text-slate-400" aria-hidden />
        )}
        <p className="mt-3 text-sm font-medium text-navy-900">
          {busy ? "Uploading…" : "Drop images here, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-slate-500">JPG, PNG, WebP, AVIF, GIF or SVG · up to 8 MB each</p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <input
        ref={inputRef}
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
