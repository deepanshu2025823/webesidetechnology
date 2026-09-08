"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { deleteCollectionItem, saveCollectionItem, type ActionState } from "@/app/admin/actions/collections";
import { Alert, Badge, EmptyState, FieldWrap, PageHeader, SubmitButton, Toggle, inputClass } from "@/components/admin/ui";
import { ImageInput } from "@/components/admin/ImageInput";
import { FileInput } from "@/components/admin/FileInput";
import { IconInput } from "@/components/admin/IconInput";
import { TagListInput } from "@/components/admin/TagListInput";
import { Icon } from "@/components/ui/Icon";
import type { Collection, Field } from "@/lib/admin/collections";
import { cn } from "@/lib/utils";

type Row = Record<string, unknown> & { id: string };

export function CollectionManager({
  collection,
  rows,
  dynamicOptions = {},
  readOnly = false,
  tools,
}: {
  collection: Collection;
  rows: Row[];
  dynamicOptions?: Record<string, { value: string; label: string }[]>;
  readOnly?: boolean;
  /** Import / export / report controls, for collections that register a dataset. */
  tools?: React.ReactNode;
}) {
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");

  const open = creating || editing !== null;
  const listFields = collection.fields.filter((f) => f.inList);

  // Collections are fully loaded already, so searching them is a client-side
  // filter across every stored value — no round trip, and it matches on fields
  // that are not shown as columns too.
  const term = query.trim().toLowerCase();
  const visible = term
    ? rows.filter((row) =>
        Object.values(row).some((value) => {
          if (value === null || value === undefined || typeof value === "object") return false;
          return String(value).toLowerCase().includes(term);
        }),
      )
    : rows;

  return (
    <>
      <PageHeader
        title={collection.title}
        description={collection.description}
        actions={
          readOnly ? null : (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
            >
              <Plus className="size-4" aria-hidden />
              Add {collection.singular.toLowerCase()}
            </button>
          )
        }
      />

      {notice ? (
        <div className="mb-5">
          <Alert tone="success">{notice}</Alert>
        </div>
      ) : null}

      {tools}

      {rows.length > 5 ? (
        <div className="relative mb-5 max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${collection.title.toLowerCase()}…`}
            aria-label={`Search ${collection.title.toLowerCase()}`}
            className={cn(inputClass, "pl-10")}
          />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={`No ${collection.title.toLowerCase()} yet`}
          description={collection.description}
          action={
            readOnly ? null : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Plus className="size-4" /> Add the first one
              </button>
            )
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title={`Nothing matches “${query.trim()}”`}
          description="Try a shorter search."
          action={
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-medium text-navy-800 hover:bg-slate-50"
            >
              Clear search
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">#</th>
                  {listFields.map((f) => (
                    <th key={f.name} className="px-5 py-3 font-medium">
                      {f.label}
                    </th>
                  ))}
                  {readOnly ? null : <th className="px-5 py-3 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {visible.map((row, i) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 text-xs text-slate-400">{i + 1}</td>
                    {listFields.map((f) => (
                      <td key={f.name} className="max-w-xs px-5 py-3.5 align-middle">
                        <CellValue field={f} value={row[f.name]} />
                      </td>
                    ))}
                    {readOnly ? null : (
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCreating(false);
                            setEditing(row);
                          }}
                          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-navy-50 hover:text-navy-900"
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <DeleteButton
                          slug={collection.slug}
                          id={row.id}
                          label={String(row[collection.titleField] ?? "")}
                          onDone={(msg) => setNotice(msg)}
                        />
                      </div>
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open ? (
        <Drawer
          title={editing ? `Edit ${collection.singular.toLowerCase()}` : `New ${collection.singular.toLowerCase()}`}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        >
          <CollectionForm
            collection={collection}
            row={editing}
            dynamicOptions={dynamicOptions}
            onSaved={(msg) => {
              setNotice(msg);
              setEditing(null);
              setCreating(false);
            }}
          />
        </Drawer>
      ) : null}
    </>
  );
}

function CellValue({ field, value }: { field: Field; value: unknown }) {
  if (field.type === "boolean") {
    return value ? <Badge tone="success">Visible</Badge> : <Badge tone="muted">Hidden</Badge>;
  }
  if (field.type === "image" && typeof value === "string" && value) {
    return (
      <span className="relative block size-10 overflow-hidden rounded-lg border border-navy-900/10 bg-slate-50">
        <Image src={value} alt="" fill sizes="40px" className="object-contain p-1" />
      </span>
    );
  }
  if (field.type === "icon" && typeof value === "string") {
    return <Icon name={value} className="size-5 text-gold-600" />;
  }
  if (field.type === "select") {
    const label = field.options?.find((o) => o.value === String(value))?.label;
    return <span className="text-navy-800">{label ?? String(value ?? "—")}</span>;
  }
  if (field.type === "taglist") {
    const tags = Array.isArray(value) ? (value as string[]) : [];
    return tags.length ? (
      <span className="flex flex-wrap gap-1">
        {tags.slice(0, 3).map((t) => (
          <span key={t} className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] text-navy-700">
            {t}
          </span>
        ))}
        {tags.length > 3 ? <span className="text-xs text-slate-400">+{tags.length - 3}</span> : null}
      </span>
    ) : (
      <span className="text-slate-400">—</span>
    );
  }
  const text = String(value ?? "");
  return <span className="line-clamp-2 text-navy-800">{text || "—"}</span>;
}

function CollectionForm({
  collection,
  row,
  dynamicOptions,
  onSaved,
}: {
  collection: Collection;
  row: Row | null;
  dynamicOptions: Record<string, { value: string; label: string }[]>;
  onSaved: (message: string) => void;
}) {
  const action = saveCollectionItem.bind(null, collection.slug);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  useEffect(() => {
    if (state.ok && state.message) onSaved(state.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        {collection.fields.map((field) => {
          const value = row?.[field.name];
          const options = dynamicOptions[field.name] ?? field.options ?? [];
          const span = field.colSpan === 2 || field.type === "boolean" ? "sm:col-span-2" : "";

          if (field.type === "boolean") {
            return (
              <div key={field.name} className={span}>
                <Toggle
                  name={field.name}
                  label={field.label}
                  help={field.help}
                  defaultChecked={value === undefined ? Boolean(field.defaultValue) : Boolean(value)}
                />
              </div>
            );
          }

          return (
            <FieldWrap
              key={field.name}
              label={field.label}
              htmlFor={field.name}
              required={field.required}
              help={field.help}
              className={span}
            >
              {field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  rows={3}
                  required={field.required}
                  placeholder={field.placeholder}
                  defaultValue={String(value ?? field.defaultValue ?? "")}
                  className={inputClass}
                />
              ) : field.type === "select" ? (
                <select
                  id={field.name}
                  name={field.name}
                  defaultValue={String(value ?? field.defaultValue ?? "")}
                  className={inputClass}
                >
                  {!field.required ? <option value="">— None —</option> : null}
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "image" ? (
                <ImageInput name={field.name} defaultValue={String(value ?? "")} folder={collection.slug} />
              ) : field.type === "file" ? (
                <FileInput name={field.name} defaultValue={String(value ?? "")} folder={collection.slug} />
              ) : field.type === "taglist" ? (
                <TagListInput
                  name={field.name}
                  defaultValue={Array.isArray(value) ? (value as string[]) : []}
                  placeholder={field.placeholder}
                />
              ) : field.type === "icon" ? (
                <IconInput name={field.name} defaultValue={String(value ?? field.defaultValue ?? "Sparkles")} />
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
                  required={field.required}
                  placeholder={field.placeholder}
                  defaultValue={String(value ?? field.defaultValue ?? "")}
                  className={inputClass}
                />
              )}
            </FieldWrap>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 border-t border-navy-900/10 pt-5">
        <SubmitButton>{row ? "Update" : "Create"}</SubmitButton>
      </div>
    </form>
  );
}

function DeleteButton({
  slug,
  id,
  label,
  onDone,
}: {
  slug: string;
  id: string;
  label: string;
  onDone: (message: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const result = await deleteCollectionItem(slug, id);
    setBusy(false);
    setConfirming(false);
    onDone(result.error ?? result.message ?? "Deleted.");
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700 disabled:opacity-60"
          aria-label={`Confirm delete ${label}`}
        >
          <Check className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Cancel"
        >
          <X className="size-4" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
      aria-label={`Delete ${label}`}
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-navy-950/50" onClick={onClose} aria-hidden />
      <div className={cn("relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl")}>
        <div className="flex items-center justify-between border-b border-navy-900/10 px-6 py-4">
          <h2 className="text-base font-semibold text-navy-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="scroll-slim flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
