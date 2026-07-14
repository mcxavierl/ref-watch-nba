import type { LeagueInsightCard } from "@/lib/league-overview-insights";

/** Stable carousel copy when no statistically significant outliers are found. */
export const EVERGREEN_TOP_STORIES: LeagueInsightCard[] = [
  {
    leagueId: "nba",
    label: "NBA",
    shortLabel: "NBA",
    kind: "league-pattern",
    kicker: "Matrix refresh",
    headline: "Historical ref-team pairing trends are being updated",
    story:
      "The ref×team matrix is recalculating after the latest ingest. Check back for verified win-rate and whistle outliers once sample thresholds are met.",
    heroValue: "N/A",
    heroLabel: "Status",
    heroTone: "neutral",
    stats: [
      { label: "Coverage", value: "Verified leagues" },
      { label: "Refresh", value: "Post-ingest" },
    ],
    links: [
      { label: "Open NBA matrix", href: "/matrix" },
      { label: "NBA hub", href: "/" },
    ],
  },
  {
    leagueId: "nfl",
    label: "NFL",
    shortLabel: "NFL",
    kind: "league-pattern",
    kicker: "Pace scan",
    headline: "League whistle pace baselines are recalibrating",
    story:
      "Flag-volume and scoring pace metrics are syncing with the latest game logs. Outlier headlines appear when variance clears the significance threshold.",
    heroValue: "N/A",
    heroLabel: "Status",
    heroTone: "neutral",
    stats: [
      { label: "Coverage", value: "Pro leagues" },
      { label: "Method", value: "Baseline variance" },
    ],
    links: [
      { label: "Open NFL matrix", href: "/nfl/matrix" },
      { label: "NFL hub", href: "/nfl" },
    ],
  },
  {
    leagueId: "nhl",
    label: "NHL",
    shortLabel: "NHL",
    kind: "league-pattern",
    kicker: "Outlier queue",
    headline: "No material outliers in the current ingest window",
    story:
      "Sample sizes and baseline comparisons did not surface a headline-grade split this cycle. Verified ref profiles and matrix cells remain available in each league hub.",
    heroValue: "N/A",
    heroLabel: "Status",
    heroTone: "neutral",
    stats: [
      { label: "Threshold", value: "15pp win / 10% whistle" },
      { label: "Source", value: "Ref-stats ingest" },
    ],
    links: [
      { label: "Open NHL matrix", href: "/nhl/matrix" },
      { label: "NHL hub", href: "/nhl" },
    ],
  },
];
