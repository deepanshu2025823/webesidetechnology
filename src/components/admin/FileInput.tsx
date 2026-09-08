"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { inputClass } from "@/components/admin/ui";

const ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,image/*,application/pdf," +
  "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Upload-or-paste field for a document — a CV, a signed agreement, a scan.
 *
 * The sibling of ImageInput, for everything that is not a picture: the file is
 * stored in the database and served from /api/media/[id], and the field keeps
 * only the URL. The original filename is kept alongside it when the caller
 * gives a `nameField`, because "resume-final-2.pdf" tells the team more than an
 * opaque media id does.
 */
export function FileInput({
  name,
  nameField,
  defaultValue = "",
  defaultName = "",
  folder = "documents",
  label = "Upload file",
}: {
  name: string;
  /** Optional second hidden input that carries the original filename. */
  nameField?: string;
  defaultValue?: string | null;
  defaultName?: string | null;
  folder?: string;
  label?: string;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [filename, setFilename] = useState(defaultName ?? "");
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
      setFilename(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={url} />
      {nameField ? <input type="hidden" name={nameField} value={filename} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-navy-900/15 px-3 py-2 text-xs font-medium text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <UploadCloud className="size-3.5" aria-hidden />}
          {busy ? "Uploading…" : label}
        </button>

        {url ? (
          <>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 truncate rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-navy-800 hover:bg-slate-200"
            >
              <FileText className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{filename || "View file"}</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setUrl("");
                setFilename("");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-navy-900/15 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
            >
              <Trash2 className="size-3.5" aria-hidden /> Remove
            </button>
          </>
        ) : null}
      </div>

      {/*
        Deliberately type="text": uploads are stored as site-relative paths,
        which fail type="url" validation and would block the whole form.
      */}
      <input
        type="text"
        inputMode="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="…or paste a link to the file"
        aria-label={label}
        className={inputClass}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
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
