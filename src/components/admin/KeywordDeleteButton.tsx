"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteKeyword } from "@/app/admin/actions/campaigns";

export function KeywordDeleteButton({ id, label }: { id: string; label: string }) {
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => void deleteKeyword(id))}
      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
      aria-label={`Delete ${label}`}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
