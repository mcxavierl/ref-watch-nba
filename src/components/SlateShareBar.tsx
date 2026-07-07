"use client";

import { Check } from "lucide-react";
import { useCallback, useState } from "react";
import type { SyndicatedSignal } from "@/lib/syndication";

export function SlateShareBar({
  shareText,
  topSignals,
  disclaimer,
  pageUrl,
  league,
}: {
  shareText: string;
  topSignals: SyndicatedSignal[];
  disclaimer: string;
  pageUrl: string;
  league: "NBA" | "NHL";
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
    await copyToClipboard(pageUrl, "link");
  }, [copyToClipboard, pageUrl]);

  const nativeShare = useCallback(async () => {
    if (!navigator.share) {
      await copySummary();
      return;
    }
    try {
      await navigator.share({
        title: `Ref Watch ${league} slate`,
        text: shareText,
        url: pageUrl,
      });
    } catch {
      /* user cancelled */
    }
  }, [copySummary, league, pageUrl, shareText]);

  if (topSignals.length === 0) return null;

  return (
    <section
      className="panel-inset section-block-tight px-4 py-4 sm:px-5"
      aria-label="Share tonight's signals"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Share tonight&apos;s signal pack</h2>
          <p className="section-lead">
            Minimum game thresholds apply — estimated values marked. Not betting advice.
          </p>
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

      <ul className="mt-4 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
        {topSignals.map((signal) => (
          <li
            key={signal.id}
            className="share-signal-item"
          >
            <span className="font-semibold text-zinc-900">{signal.matchup}</span>
            {" — "}
            {signal.headline}
            {signal.provenance !== "computed-from-real" && (
              <span className="ml-1 text-xs font-medium text-amber-800">
                ({signal.provenanceLabel})
              </span>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">{disclaimer}</p>
    </section>
  );
}
