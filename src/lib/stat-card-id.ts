/**
 * Stable stat-card anchor IDs for deep links.
 *
 * Prefer semantic keys (insight kind, signal kind) over slugified display copy
 * so anchors survive data refreshes and copy edits.
 */

/** Stable URL hash segment for a stat card anchor (fallback only). */
export function statCardHashId(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Full share URL for the current page with a stat-card hash. */
export function statCardShareUrl(hashId: string): string {
  if (typeof window === "undefined") return `#${hashId}`;
  const url = new URL(window.location.href);
  url.hash = hashId;
  return url.toString();
}

/** Hub highlight cards (RankingsInsight.id). */
export type HubInsightAnchorId =
  | "top-scoring"
  | "bottom-scoring"
  | "top-over"
  | "top-under"
  | "top-ats"
  | "top-ou-betting"
  | "top-whistle"
  | "light-whistle"
  | "gsni-highlight";

/** Ref profile signal cards (ProfileSignal.kind). */
export type ProfileSignalAnchorId =
  | "scoring-delta"
  | "whistle-delta"
  | "over-tilt"
  | "home-road-scoring"
  | "home-ats";

export const STAT_CARD_ANCHOR = {
  hubInsight: (id: HubInsightAnchorId | string) => id,
  profileSignal: (kind: ProfileSignalAnchorId | string) => kind,
  metricLabel: (label: string) => statCardHashId(label),
  trend: {
    homeTeamWl: "home-team-wl",
    homeTeamAts: "home-team-ats",
  },
} as const;
