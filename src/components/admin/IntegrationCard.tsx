"use client";

import { useActionState, useState } from "react";
import { ChevronDown } from "lucide-react";
import { saveIntegration, type ActionState } from "@/app/admin/actions/integrations";
import { Alert, Badge, Card, SubmitButton, Toggle, inputClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  endpoint: "API endpoint",
  token: "API token",
  sender: "Sender ID",
  wabaId: "WABA id",
  number: "Virtual number",
  accountId: "Account id",
  customerId: "Customer id",
  developerToken: "Developer token",
  refreshToken: "Refresh token",
  keyId: "Key id",
  keySecret: "Key secret",
  webhookSecret: "Webhook secret",
  clientId: "Client id",
  clientSecret: "Client secret",
};

/** Secrets are never sent back to the browser — only whether one is stored. */
export function IntegrationCard({
  provider,
  label,
  fields,
  saved,
  editable,
}: {
  provider: string;
  label: string;
  fields: string[];
  saved: { isEnabled: boolean; config: Record<string, string> } | null;
  editable: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveIntegration, {});
  const [open, setOpen] = useState(false);

  const configured = saved ? Object.keys(saved.config).length > 0 : false;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-navy-900">{label}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {configured ? `${Object.keys(saved!.config).length} setting(s) stored` : "Not configured"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={saved?.isEnabled ? "success" : configured ? "warn" : "muted"}>
            {saved?.isEnabled ? "enabled" : configured ? "off" : "empty"}
          </Badge>
          {editable ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label={`Configure ${label}`}
              aria-expanded={open}
            >
              <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
            </button>
          ) : null}
        </div>
      </div>

      {open && editable ? (
        <form action={action} className="mt-4 space-y-3 border-t border-navy-900/10 pt-4">
          <input type="hidden" name="provider" value={provider} />
          {state.error ? <Alert tone="error">{state.error}</Alert> : null}
          {state.message ? <Alert tone="success">{state.message}</Alert> : null}

          {fields.map((field) => (
            <div key={field}>
              <label htmlFor={`${provider}-${field}`} className="text-xs font-medium text-slate-600">
                {LABELS[field] ?? field}
              </label>
              <input
                id={`${provider}-${field}`}
                name={field}
                defaultValue={saved?.config[field] ?? ""}
                placeholder={saved?.config[field] ? "Stored — retype to change" : ""}
                className={`${inputClass} mt-1`}
              />
            </div>
          ))}

          <Toggle name="isEnabled" label="Enabled" defaultChecked={saved?.isEnabled ?? false} />
          <SubmitButton>Save</SubmitButton>
        </form>
      ) : null}
    </Card>
  );
}
