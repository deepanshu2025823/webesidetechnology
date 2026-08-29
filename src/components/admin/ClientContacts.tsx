"use client";

import { useState } from "react";
import { Mail, Pencil, Phone, Plus, Star, Trash2, X } from "lucide-react";
import { deleteContact, saveContact } from "@/app/admin/actions/crm";
import { Card, FieldWrap, Toggle, inputClass } from "@/components/admin/ui";

export type Contact = {
  id: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  whatsapp: string;
  isPrimary: boolean;
};

export function ClientContacts({
  clientId,
  contacts,
  editable,
}: {
  clientId: string;
  contacts: Contact[];
  editable: boolean;
}) {
  const [editing, setEditing] = useState<Contact | null>(null);
  const [adding, setAdding] = useState(false);

  const save = saveContact.bind(null, clientId);
  const open = adding || editing;

  return (
    <Card
      title="Contacts"
      description="People you deal with at this company. Mark one as primary."
    >
      {contacts.length ? (
        <ul className="divide-y divide-navy-900/5">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-start gap-3 py-3 first:pt-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-50 text-sm font-semibold text-navy-800">
                {c.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-navy-900">
                  {c.name}
                  {c.isPrimary ? <Star className="size-3.5 fill-gold-400 text-gold-500" aria-label="Primary" /> : null}
                </p>
                {c.designation ? <p className="text-xs text-slate-500">{c.designation}</p> : null}
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  {c.email ? (
                    <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-gold-700">
                      <Mail className="size-3" aria-hidden /> {c.email}
                    </a>
                  ) : null}
                  {c.phone ? (
                    <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-gold-700">
                      <Phone className="size-3" aria-hidden /> {c.phone}
                    </a>
                  ) : null}
                </div>
              </div>
              {editable ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setEditing(c);
                    }}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-navy-50 hover:text-navy-900"
                    aria-label={`Edit ${c.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <form action={deleteContact.bind(null, clientId, c.id)}>
                    <button
                      type="submit"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No contacts yet.</p>
      )}

      {editable ? (
        open ? (
          <form action={save} className="mt-4 space-y-4 rounded-xl border border-navy-900/10 bg-slate-50 p-4">
            {editing ? <input type="hidden" name="contactId" value={editing.id} /> : null}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-navy-900">{editing ? "Edit contact" : "New contact"}</p>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setAdding(false);
                }}
                className="rounded-lg p-1 text-slate-500 hover:bg-white"
                aria-label="Cancel"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldWrap label="Name" htmlFor="contact-name" required>
                <input id="contact-name" name="name" required defaultValue={editing?.name} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Designation" htmlFor="contact-designation">
                <input id="contact-designation" name="designation" defaultValue={editing?.designation} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Email" htmlFor="contact-email">
                <input id="contact-email" name="email" type="email" defaultValue={editing?.email} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Phone" htmlFor="contact-phone">
                <input id="contact-phone" name="phone" defaultValue={editing?.phone} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="WhatsApp" htmlFor="contact-whatsapp">
                <input id="contact-whatsapp" name="whatsapp" defaultValue={editing?.whatsapp} className={inputClass} />
              </FieldWrap>
            </div>

            <Toggle name="isPrimary" label="Primary contact" defaultChecked={editing?.isPrimary ?? contacts.length === 0} />

            <button
              type="submit"
              className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              {editing ? "Update contact" : "Add contact"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-navy-900/25 px-4 py-2 text-sm font-medium text-navy-800 hover:border-gold-500 hover:bg-gold-50"
          >
            <Plus className="size-4" aria-hidden /> Add contact
          </button>
        )
      ) : null}
    </Card>
  );
}
