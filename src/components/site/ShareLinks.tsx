"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { LinkedinIcon, XIcon } from "@/components/ui/SocialIcons";

export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the share links still work.
    }
  }

  const linkClass =
    "grid size-10 place-items-center rounded-full border border-navy-900/15 text-navy-700 transition-colors hover:border-gold-500 hover:bg-gold-50 hover:text-gold-800";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-navy-900">Share</span>
      <a
        className={linkClass}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
      >
        <LinkedinIcon className="size-4" />
      </a>
      <a
        className={linkClass}
        href={`https://twitter.com/intent/tweet?url=${encoded}&text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
      >
        <XIcon className="size-4" />
      </a>
      <button type="button" onClick={copy} className={linkClass} aria-label="Copy link">
        {copied ? <Check className="size-4 text-gold-700" /> : <Link2 className="size-4" />}
      </button>
    </div>
  );
}
