"use client";

import { Check, Link2 } from "lucide-react";
import { useCallback, useState, type MouseEvent } from "react";
import { statCardShareUrl } from "@/lib/stat-card-id";

export function StatCardShareButton({
  hashId,
  label,
  className = "",
}: {
  hashId: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const url = statCardShareUrl(hashId);
      history.pushState(null, "", `#${hashId}`);

      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    },
    [hashId],
  );

  return (
    <button
      type="button"
      className={`stat-card-share-btn ${className}`.trim()}
      aria-label={label ? `Share ${label} link` : "Share stat card link"}
      title={copied ? "Link copied" : "Copy share link"}
      onClick={handleShare}
    >
      {copied ? (
        <Check className="stat-card-share-btn-icon" strokeWidth={2.1} aria-hidden />
      ) : (
        <Link2 className="stat-card-share-btn-icon" strokeWidth={2.1} aria-hidden />
      )}
    </button>
  );
}
