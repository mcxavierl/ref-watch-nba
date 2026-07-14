"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type LiveRegionPoliteness = "polite" | "assertive" | "off";

export type LiveRegionProps = {
  children: ReactNode;
  /** How urgently assistive tech should announce updates. Default: polite. */
  politeness?: LiveRegionPoliteness;
  /** When true, the entire region is read as one update. Default: true. */
  atomic?: boolean;
  /** Visually hidden but available to screen readers. Default: true. */
  visuallyHidden?: boolean;
  className?: string;
  id?: string;
};

/**
 * Visually hidden live region for announcing dynamic dashboard updates.
 * Pair with `useLiveAnnouncement` for filter/refresh result summaries.
 */
export function LiveRegion({
  children,
  politeness = "polite",
  atomic = true,
  visuallyHidden = true,
  className = "",
  id,
}: LiveRegionProps) {
  return (
    <div
      id={id}
      aria-live={politeness}
      aria-atomic={atomic}
      className={[visuallyHidden ? "sr-live" : "", className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}

/**
 * Announces a message to screen readers when `message` changes.
 * Clears after `clearAfterMs` so repeated identical filters still re-announce.
 */
export function useLiveAnnouncement(
  message: string,
  options?: { clearAfterMs?: number; enabled?: boolean },
): string {
  const { clearAfterMs = 800, enabled = true } = options ?? {};
  const [announcement, setAnnouncement] = useState("");
  const prevMessage = useRef("");

  useEffect(() => {
    if (!enabled || !message || message === prevMessage.current) return;
    prevMessage.current = message;
    setAnnouncement("");
    const frame = requestAnimationFrame(() => setAnnouncement(message));
    const timer = window.setTimeout(() => setAnnouncement(""), clearAfterMs);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [message, clearAfterMs, enabled]);

  return announcement;
}

export type FilterResultsAnnouncerProps = {
  resultCount: number;
  totalCount: number;
  filterLabel: string;
  entityLabel?: string;
};

/**
 * Drop-in announcer for filtered data containers (Research, Rankings, Matrix).
 */
export function FilterResultsAnnouncer({
  resultCount,
  totalCount,
  filterLabel,
  entityLabel = "results",
}: FilterResultsAnnouncerProps) {
  const message =
    filterLabel === "all"
      ? `Showing all ${totalCount} ${entityLabel}.`
      : `Filter ${filterLabel}: showing ${resultCount} of ${totalCount} ${entityLabel}.`;

  const announcement = useLiveAnnouncement(message);

  return <LiveRegion politeness="polite">{announcement}</LiveRegion>;
}
