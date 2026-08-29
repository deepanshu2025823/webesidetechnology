"use client";

import * as icons from "lucide-react";
import type { LucideProps } from "lucide-react";

/**
 * Renders a Lucide icon chosen by name in the admin panel. Falls back to a
 * neutral sparkle when an editor types a name that no longer exists.
 */
export function Icon({ name, ...props }: { name?: string | null } & LucideProps) {
  const registry = icons as unknown as Record<string, React.ComponentType<LucideProps>>;
  const Cmp = (name && registry[name]) || registry.Sparkles;
  return <Cmp aria-hidden {...props} />;
}
