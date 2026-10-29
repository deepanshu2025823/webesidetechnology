"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A submit button for plain server-action forms that shows the click landed:
 * it disables and spins until the action returns. Without it a slow save looks
 * exactly like a missed click.
 */
export function PendingButton({
  children,
  className,
  pendingLabel,
  icon,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: React.ReactNode; icon?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || rest.disabled} aria-busy={pending} className={cn("disabled:opacity-60", className)} {...rest}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {pending && pendingLabel !== undefined ? pendingLabel : children}
    </button>
  );
}
