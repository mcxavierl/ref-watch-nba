"use client";

import { Check } from "lucide-react";
import { useCallback, useState } from "react";

export function MatrixSplitShareBar({
  title,
  preview,
  shareText,
  linkShareText,
  pageUrl,
  disclaimer = "Historical splits only. Not betting advice.",
}: {
  title: string;
  preview: string;
  shareText: string;
  linkShareText?: string;
  pageUrl: string;
  disclaimer?: string;
}) {
  const [copied, setCopied] = useState<"summary" | "link" | false>(false);

  const flashCopied = useCallback((kind: "summary" | "link") => {
    setCopied(kind);
    window.setTimeout(() => setCopied(false), 2000);
  }, []);

  const copyToClipboard = useCallback(
    async (text: string, kind: "summary" | "link") => {
      try {
        await navigator.clipboard.writeText(text);
        flashCopied(kind);
      } catch {
        setCopied(false);
      }
    },
    [flashCopied],
  );

  const copySummary = useCallback(async () => {
    await copyToClipboard(shareText, "summary");
  }, [copyToClipboard, shareText]);

  const copyLink = useCallback(async () => {
    await copyToClipboard(linkShareText ?? pageUrl, "link");
  }, [copyToClipboard, linkShareText, pageUrl]);

  const nativeShare = useCallback(async () => {
    if (!navigator.share) {
      await copySummary();
      return;
    }
    try {
      await navigator.share({
        title,
        text: shareText,
        url: pageUrl,
      });
    } catch {
      /* user cancelled */
    }
  }, [copySummary, pageUrl, shareText, title]);

  return (
    <section
      className="matrix-split-share panel-inset section-block-tight px-4 py-4 sm:px-5"
      aria-label="Share this split"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="matrix-split-share-preview">{preview}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copySummary}
            aria-live="polite"
            className={`btn-secondary inline-flex items-center gap-1.5 ${
              copied === "summary" ? "btn-success" : ""
            }`}
          >
            {copied === "summary" ? (
              <Check className="size-4 text-emerald-700" aria-hidden />
            ) : null}
            {copied === "summary" ? "Copied" : "Copy summary"}
          </button>
          <button
            type="button"
            onClick={copyLink}
            className={`btn-secondary inline-flex items-center gap-1.5 ${
              copied === "link" ? "btn-success" : ""
            }`}
          >
            {copied === "link" ? (
              <Check className="size-4 text-emerald-700" aria-hidden />
            ) : null}
            {copied === "link" ? "Link copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={nativeShare}
            className="btn-secondary inline-flex items-center gap-1.5"
          >
            Share
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">{disclaimer}</p>
    </section>
  );
}
