"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Eye, EyeOff, FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { deleteDocument, saveDocument, toggleDocumentVisibility, type ActionState } from "@/app/admin/actions/documents";
import { Alert, Badge, Card, SubmitButton, Toggle, inputClass } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  url: string;
  category: string;
  version: number;
  size: number;
  isClientVisible: boolean;
  clientName: string | null;
  projectName: string | null;
  uploadedBy: string | null;
  createdAt: string;
};

const CATEGORIES = ["General", "Contract", "Proposal", "Invoice", "Receipt", "Brief", "Creative", "Report", "Handover"];

export function DocumentManager({
  rows,
  clients,
  projects,
  services,
  editable,
}: {
  rows: Row[];
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  services: { id: string; title: string }[];
  editable: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveDocument, {});
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<{ url: string; name: string; mimeType: string; size: number } | null>(null);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Clearing the picked file is state, so it is adjusted during render.
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.ok) setUploaded(null);
  }

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  async function upload(file: File) {
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("folder", "documents");
    const res = await fetch("/api/upload", { method: "POST", body });
    const data = await res.json();
    setUploading(false);
    if (res.ok && data.url) {
      setUploaded({ url: data.url, name: file.name, mimeType: file.type, size: file.size });
    }
  }

  // Group by client so the list reads as a folder tree.
  const grouped = rows.reduce<Record<string, Row[]>>((acc, row) => {
    const key = row.clientName ?? "Agency";
    (acc[key] ??= []).push(row);
    return acc;
  }, {});

  return (
    <>
      {editable ? (
        <Card title="Add a document" className="mb-6">
          <form ref={formRef} action={action} className="space-y-4">
            {state.error ? <Alert tone="error">{state.error}</Alert> : null}
            {state.message ? <Alert tone="success">{state.message}</Alert> : null}

            <input type="hidden" name="url" value={uploaded?.url ?? ""} />
            <input type="hidden" name="mimeType" value={uploaded?.mimeType ?? ""} />
            <input type="hidden" name="size" value={uploaded?.size ?? 0} />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-900/20 px-4 py-6 text-sm font-medium text-navy-800 hover:border-gold-400 hover:bg-gold-50/40"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              {uploading ? "Uploading…" : uploaded ? `Selected: ${uploaded.name}` : "Choose a file"}
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />

            <div className="grid gap-3 sm:grid-cols-12">
              <input
                name="name"
                required
                placeholder="Document name"
                defaultValue={uploaded?.name ?? ""}
                key={uploaded?.url}
                className={`${inputClass} sm:col-span-4`}
              />
              <select name="category" defaultValue="General" className={`${inputClass} sm:col-span-2`} aria-label="Category">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select name="clientId" defaultValue="" className={`${inputClass} sm:col-span-2`} aria-label="Client">
                <option value="">Agency</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select name="projectId" defaultValue="" className={`${inputClass} sm:col-span-2`} aria-label="Project">
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select name="serviceId" defaultValue="" className={`${inputClass} sm:col-span-2`} aria-label="Service">
                <option value="">No service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <Toggle
              name="isClientVisible"
              label="Visible in the client portal"
              help="Off by default — internal files stay internal."
            />

            <SubmitButton>Save document</SubmitButton>
          </form>
        </Card>
      ) : null}

      {Object.entries(grouped).map(([group, docs]) => (
        <Card key={group} title={group} className="mb-4">
          <ul className="divide-y divide-navy-900/5">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 py-3">
                <FileText className="size-4 shrink-0 text-slate-400" aria-hidden />
                <span className="min-w-0 flex-1">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-navy-900 hover:text-gold-700"
                  >
                    {doc.name}
                  </a>
                  <span className="block text-xs text-slate-500">
                    {doc.category}
                    {doc.projectName ? ` · ${doc.projectName}` : ""}
                    {doc.version > 1 ? ` · v${doc.version}` : ""} · {Math.round(doc.size / 1024)} KB ·{" "}
                    {doc.uploadedBy ?? "Team"} · {formatDate(doc.createdAt)}
                  </span>
                </span>

                {doc.isClientVisible ? <Badge tone="success">shared</Badge> : <Badge tone="muted">internal</Badge>}

                {editable ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startTransition(() => void toggleDocumentVisibility(doc.id, !doc.isClientVisible))}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-navy-50 hover:text-navy-900"
                      aria-label={doc.isClientVisible ? "Hide from client" : "Share with client"}
                    >
                      {doc.isClientVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => void deleteDocument(doc.id))}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </>
  );
}
