"use client";

import { Check, Copy, Share2 } from "lucide-react";
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
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [shareText]);

  const nativeShare = useCallback(async () => {
    if (!navigator.share) {
      await copyToClipboard();
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
  }, [copyToClipboard, league, pageUrl, shareText]);

  if (topSignals.length === 0) return null;

  return (
    <section className="panel-inset mb-6 px-4 py-4 sm:px-5" aria-label="Share tonight's signals">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Share tonight&apos;s signals</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Sample-gated only — estimated values marked. Not betting advice.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyToClipboard}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
          >
            {copied ? (
              <Check className="size-4 text-emerald-600" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            {copied ? "Copied" : "Copy summary"}
          </button>
          <button
            type="button"
            onClick={nativeShare}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
          >
            <Share2 className="size-4" aria-hidden />
            Share
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-zinc-700">
        {topSignals.map((signal) => (
          <li key={signal.id} className="border-l-2 border-zinc-300 pl-3">
            <span className="font-medium text-zinc-900">{signal.matchup}</span>
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
