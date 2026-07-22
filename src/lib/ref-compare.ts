import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { EMPTY_DISPLAY } from "@/lib/finding-copy";
import { GSNI_INSUFFICIENT_DATA_LABEL } from "@/lib/gsni-display";
import { gsniFromRefProfile } from "@/lib/gsni-display";
import { formatGsniScoreValue } from "@/lib/gsni-ui";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import { directoryScoringDisplay, prefersPctScoringDelta } from "@/lib/scoring-metrics";
import type { SeasonScopeMode } from "@/lib/season-scope";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export type CompareRefKey = `${LeagueId}:${string}`;

export type CompareRefPickerEntry = {
  key: CompareRefKey;
  slug: string;
  name: string;
  games: number;
  leagueId: LeagueId;
  leagueLabel: string;
  href: string;
};

export type CompareRefBundle = {
  leagueId: LeagueId;
  slug: string;
  profile: RefProfile;
  meta: RefStatsFile["meta"];
  config: (typeof LEAGUES)[LeagueId];
  scopeLabel: string;
};

export type CompareMetricRow = {
  id: string;
  label: string;
  valueA: string;
  valueB: string;
  detailA?: string;
  detailB?: string;
  detailDeltaA?: number;
  detailDeltaB?: number;
  sampleGamesA?: number;
  sampleGamesB?: number;
  /** Normalized league-relative position for Official A in [-1, 1]. */
  signalA?: number | null;
  /** Normalized league-relative position for Official B in [-1, 1]. */
  signalB?: number | null;
  /** Raw GSNI scores when row kind is gsni. */
  gsniA?: number | null;
  gsniB?: number | null;
  kind?: "metric" | "disclaimer" | "gsni";
};

export type CompareLeagueMetric = {
  id: string;
  label: string;
  value: string;
  detail?: string;
};

/** Only games are semantically comparable across different leagues/sports. */
const CROSS_LEAGUE_SHARED_METRIC_IDS = new Set(["games"]);

const COMPARE_LEAGUE_IDS: LeagueId[] = [
  "nba",
  "nhl",
  "nfl",
  "epl",
  "laliga",
];

export { COMPARE_LEAGUE_IDS };

export const GSNI_COMPARE_LEAGUE_IDS: LeagueId[] = ["nba", "nfl"];

export function compareSupportsGsni(leagueId: LeagueId): boolean {
  return GSNI_COMPARE_LEAGUE_IDS.includes(leagueId);
}

export function parseCompareLeagueParam(
  raw: string | null | undefined,
): LeagueId | null {
  if (!raw) return null;
  const leagueId = raw.toLowerCase() as LeagueId;
  return COMPARE_LEAGUE_IDS.includes(leagueId) ? leagueId : null;
}

export function compareLeagueHref(leagueId: LeagueId): string {
  return `/compare?league=${encodeURIComponent(leagueId)}`;
}

export function encodeCompareRef(leagueId: LeagueId, slug: string): CompareRefKey {
  return `${leagueId}:${slug}`;
}

export function parseCompareRef(
  raw: string | null | undefined,
): { leagueId: LeagueId; slug: string } | null {
  if (!raw) return null;
  const idx = raw.indexOf(":");
  if (idx <= 0) return null;
  const leagueId = raw.slice(0, idx) as LeagueId;
  const slug = raw.slice(idx + 1).trim();
  if (!COMPARE_LEAGUE_IDS.includes(leagueId) || !slug) return null;
  return { leagueId, slug };
}

function scoringValue(
  profile: RefProfile,
  meta: RefStatsFile["meta"],
  config: (typeof LEAGUES)[LeagueId],
): { value: string; detail: string; detailDelta?: number } {
  const leagueAvg = meta.leagueAvgTotal;
  if (leagueAvg && prefersPctScoringDelta(leagueAvg)) {
    const display = directoryScoringDisplay(profile, leagueAvg);
    return {
      value: display.formatted,
      detail: `vs ${leagueAvg.toFixed(1)} ${config.metrics.scoreUnitPlural}/game`,
      detailDelta: profile.totalPointsDelta,
    };
  }
  return {
    value: formatSigned(profile.totalPointsDelta),
    detail: `vs league avg ${config.metrics.scoreUnitPlural}`,
    detailDelta: profile.totalPointsDelta,
  };
}

function whistleValue(
  profile: RefProfile,
  config: (typeof LEAGUES)[LeagueId],
): { value: string; detail: string; detailDelta: number } {
  const delta =
    config.whistleFromMinors
      ? profile.nhlAnalytics?.minorsDelta ?? profile.foulsDelta
      : config.id === "nfl"
        ? profile.nflAnalytics?.flagsDelta ?? profile.foulsDelta
        : profile.foulsDelta;
  return {
    value: formatSigned(delta),
    detail: config.metrics.whistleColumn.toLowerCase(),
    detailDelta: delta,
  };
}

type BundleMetric = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  detailDelta?: number;
  signal?: number | null;
};

function normalizeSignal(delta: number, span: number): number {
  if (!Number.isFinite(delta) || span <= 0) return 0;
  return Math.max(-1, Math.min(1, delta / span));
}

function gsniMetric(bundle: CompareRefBundle): BundleMetric | null {
  if (!compareSupportsGsni(bundle.leagueId)) return null;
  const score = gsniFromRefProfile(bundle.profile);
  if (score === null) {
    return {
      id: "gsni",
      label: "Game-State Index",
      value: GSNI_INSUFFICIENT_DATA_LABEL,
      detail: "High-leverage sample gate",
      signal: null,
    };
  }
  return {
    id: "gsni",
    label: "Game-State Index",
    value: formatGsniScoreValue(score),
    detail: "vs league avg in matched states",
    signal: normalizeSignal(score, 3),
  };
}

function bundleMetrics(bundle: CompareRefBundle): BundleMetric[] {
  const { profile, meta, config } = bundle;
  const scoring = scoringValue(profile, meta, config);
  const whistle = whistleValue(profile, config);
  const rows: BundleMetric[] = [
    {
      id: "games",
      label: "Games",
      value: String(profile.games),
      signal: normalizeSignal(
        profile.games - (meta.minSampleSize ?? profile.games),
        Math.max(meta.minSampleSize ?? 1, 50),
      ),
    },
    {
      id: "scoring",
      label: config.metrics.scoringColumn,
      value: scoring.value,
      detail: scoring.detail,
      detailDelta: scoring.detailDelta,
      signal: normalizeSignal(profile.totalPointsDelta, 5),
    },
    {
      id: "over",
      label: config.metrics.overColumn,
      value: formatPct(profile.overRate),
      detail: `vs ${meta.leagueOverBaseline} ${config.metrics.scoreUnitPlural}`,
      signal: normalizeSignal(profile.overRate - 0.5, 0.25),
    },
    {
      id: "whistle",
      label: config.metrics.whistleColumn,
      value: whistle.value,
      detail: whistle.detail,
      detailDelta: whistle.detailDelta,
      signal: normalizeSignal(whistle.detailDelta, 3),
    },
  ];

  if (config.showOtRate && profile.nhlAnalytics?.overtimeRate !== undefined) {
    rows.push({
      id: "ot",
      label: "OT rate",
      value: formatPct(profile.nhlAnalytics.overtimeRate),
    });
  }

  if (config.id === "nfl" && profile.nflAnalytics?.penaltyYardsDelta !== undefined) {
    rows.push({
      id: "yards",
      label: "Penalty yards Δ",
      value: formatSigned(profile.nflAnalytics.penaltyYardsDelta),
    });
  }

  if (config.id === "nfl" && profile.nflAnalytics?.balanceKind) {
    rows.push({
      id: "balance",
      label: "Penalty balance",
      value: profile.nflAnalytics.balanceKind,
    });
  }

  const gsni = gsniMetric(bundle);
  if (gsni) rows.push(gsni);

  return rows;
}

export function buildCompareLeagueMetrics(
  bundle: CompareRefBundle,
): CompareLeagueMetric[] {
  return bundleMetrics(bundle).filter((row) => row.id !== "games");
}

export const CROSS_LEAGUE_COMPARE_DISCLAIMER =
  "Cross-league compare: scoring, whistle, and over-rate use each sport's native definitions (e.g. NBA fouls vs EPL fouls). Only games are shown side-by-side below; league-specific metrics appear in each official's column.";

function metricRowFromBundlePair(
  leftRow: BundleMetric,
  rightRow: BundleMetric | undefined,
  leftGsni: number | null,
  rightGsni: number | null,
  leftGames: number,
  rightGames: number,
): CompareMetricRow {
  const isGsni = leftRow.id === "gsni";
  return {
    id: leftRow.id,
    label: leftRow.label,
    valueA: leftRow.value,
    valueB: rightRow?.value ?? EMPTY_DISPLAY,
    detailA: leftRow.detail,
    detailB: rightRow?.detail,
    detailDeltaA: leftRow.detailDelta,
    detailDeltaB: rightRow?.detailDelta,
    sampleGamesA: leftGames,
    sampleGamesB: rightGames,
    signalA: leftRow.signal ?? null,
    signalB: rightRow?.signal ?? null,
    gsniA: isGsni ? leftGsni : null,
    gsniB: isGsni ? rightGsni : null,
    kind: isGsni ? "gsni" : "metric",
  };
}

export function buildCompareMetricRows(
  left: CompareRefBundle,
  right: CompareRefBundle,
): CompareMetricRow[] {
  const sameLeague = left.leagueId === right.leagueId;
  const leftMetrics = bundleMetrics(left);
  const rightMetrics = bundleMetrics(right);
  const rightById = new Map(rightMetrics.map((row) => [row.id, row]));
  const leftGsni = compareSupportsGsni(left.leagueId)
    ? gsniFromRefProfile(left.profile)
    : null;
  const rightGsni = compareSupportsGsni(right.leagueId)
    ? gsniFromRefProfile(right.profile)
    : null;

  if (!sameLeague) {
    const shared: CompareMetricRow[] = [];
    for (const leftRow of leftMetrics) {
      if (!CROSS_LEAGUE_SHARED_METRIC_IDS.has(leftRow.id)) continue;
      const rightRow = rightById.get(leftRow.id);
      if (!rightRow) continue;
      shared.push(
        metricRowFromBundlePair(
          leftRow,
          rightRow,
          leftGsni,
          rightGsni,
          left.profile.games,
          right.profile.games,
        ),
      );
    }

    shared.push({
      id: "cross-league-disclaimer",
      label: "Cross-league note",
      valueA: "",
      valueB: "",
      kind: "disclaimer",
    });
    return shared;
  }

  const seen = new Set<string>();
  const merged: CompareMetricRow[] = [];

  for (const leftRow of leftMetrics) {
    seen.add(leftRow.id);
    const rightRow = rightById.get(leftRow.id);
    merged.push(
      metricRowFromBundlePair(
        leftRow,
        rightRow,
        leftGsni,
        rightGsni,
        left.profile.games,
        right.profile.games,
      ),
    );
  }

  for (const rightRow of rightMetrics) {
    if (seen.has(rightRow.id)) continue;
    const row = metricRowFromBundlePair(
      rightRow,
      rightRow,
      leftGsni,
      rightGsni,
      right.profile.games,
      right.profile.games,
    );
    merged.push({
      ...row,
      valueA: EMPTY_DISPLAY,
      valueB: rightRow.value,
      detailA: undefined,
      detailB: rightRow.detail,
      signalA: null,
      signalB: rightRow.signal ?? null,
    });
  }

  return merged;
}

export function buildCompareShareText(
  left: CompareRefBundle | null,
  right: CompareRefBundle | null,
  scopeLabel: string,
): string {
  if (!left && !right) {
    return "Compare officials side-by-side on Ref Watch.";
  }
  const lines = [`Ref Watch Official Compare (${scopeLabel})`];
  if (left) {
    const scoring = scoringValue(left.profile, left.meta, left.config);
    lines.push(
      `${left.profile.name} (${left.config.shortLabel}): ${left.profile.games} gp · ${scoring.value} scoring · ${formatPct(left.profile.overRate)} over`,
    );
  }
  if (right) {
    const scoring = scoringValue(right.profile, right.meta, right.config);
    lines.push(
      `${right.profile.name} (${right.config.shortLabel}): ${right.profile.games} gp · ${scoring.value} scoring · ${formatPct(right.profile.overRate)} over`,
    );
  }
  lines.push("Descriptive tendencies only, not picks.");
  return lines.join("\n");
}

export function buildCompareShareUrl(
  siteUrl: string,
  leftKey: CompareRefKey | null,
  rightKey: CompareRefKey | null,
  scopeMode: SeasonScopeMode,
): string {
  const params = new URLSearchParams();
  if (leftKey) params.set("a", leftKey);
  if (rightKey) params.set("b", rightKey);
  if (scopeMode !== "last10") params.set("scope", scopeMode);
  const query = params.toString();
  return `${siteUrl.replace(/\/$/, "")}/compare${query ? `?${query}` : ""}`;
}
