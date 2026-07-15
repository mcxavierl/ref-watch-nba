import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { EMPTY_DISPLAY } from "@/lib/finding-copy";
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
  kind?: "metric" | "disclaimer";
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
): { value: string; detail: string } {
  const leagueAvg = meta.leagueAvgTotal;
  if (leagueAvg && prefersPctScoringDelta(leagueAvg)) {
    const display = directoryScoringDisplay(profile, leagueAvg);
    return {
      value: display.formatted,
      detail: `vs ${leagueAvg.toFixed(1)} ${config.metrics.scoreUnitPlural}/game`,
    };
  }
  return {
    value: formatSigned(profile.totalPointsDelta),
    detail: `vs league avg ${config.metrics.scoreUnitPlural}`,
  };
}

function whistleValue(
  profile: RefProfile,
  config: (typeof LEAGUES)[LeagueId],
): { value: string; detail: string } {
  const delta =
    config.whistleFromMinors
      ? profile.nhlAnalytics?.minorsDelta ?? profile.foulsDelta
      : config.id === "nfl"
        ? profile.nflAnalytics?.flagsDelta ?? profile.foulsDelta
        : profile.foulsDelta;
  return {
    value: formatSigned(delta),
    detail: config.metrics.whistleColumn.toLowerCase(),
  };
}

type BundleMetric = {
  id: string;
  label: string;
  value: string;
  detail?: string;
};

function bundleMetrics(bundle: CompareRefBundle): BundleMetric[] {
  const { profile, meta, config } = bundle;
  const scoring = scoringValue(profile, meta, config);
  const whistle = whistleValue(profile, config);
  const rows: BundleMetric[] = [
    {
      id: "games",
      label: "Games",
      value: String(profile.games),
    },
    {
      id: "scoring",
      label: config.metrics.scoringColumn,
      value: scoring.value,
      detail: scoring.detail,
    },
    {
      id: "over",
      label: config.metrics.overColumn,
      value: formatPct(profile.overRate),
      detail: `vs ${meta.leagueOverBaseline} ${config.metrics.scoreUnitPlural}`,
    },
    {
      id: "whistle",
      label: config.metrics.whistleColumn,
      value: whistle.value,
      detail: whistle.detail,
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

  return rows;
}

export function buildCompareLeagueMetrics(
  bundle: CompareRefBundle,
): CompareLeagueMetric[] {
  return bundleMetrics(bundle).filter((row) => row.id !== "games");
}

export const CROSS_LEAGUE_COMPARE_DISCLAIMER =
  "Cross-league compare: scoring, whistle, and over-rate use each sport's native definitions (e.g. NBA fouls vs EPL fouls). Only games are shown side-by-side below; league-specific metrics appear in each official's column.";

export function buildCompareMetricRows(
  left: CompareRefBundle,
  right: CompareRefBundle,
): CompareMetricRow[] {
  const sameLeague = left.leagueId === right.leagueId;
  const leftMetrics = bundleMetrics(left);
  const rightMetrics = bundleMetrics(right);
  const rightById = new Map(rightMetrics.map((row) => [row.id, row]));

  if (!sameLeague) {
    const shared: CompareMetricRow[] = [];
    for (const leftRow of leftMetrics) {
      if (!CROSS_LEAGUE_SHARED_METRIC_IDS.has(leftRow.id)) continue;
      const rightRow = rightById.get(leftRow.id);
      if (!rightRow) continue;
      shared.push({
        id: leftRow.id,
        label: leftRow.label,
        valueA: leftRow.value,
        valueB: rightRow.value,
        detailA: leftRow.detail,
        detailB: rightRow.detail,
        kind: "metric",
      });
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
    merged.push({
      id: leftRow.id,
      label: leftRow.label,
      valueA: leftRow.value,
      valueB: rightRow?.value ?? EMPTY_DISPLAY,
      detailA: leftRow.detail,
      detailB: rightRow?.detail,
      kind: "metric",
    });
  }

  for (const rightRow of rightMetrics) {
    if (seen.has(rightRow.id)) continue;
    merged.push({
      id: rightRow.id,
      label: rightRow.label,
      valueA: EMPTY_DISPLAY,
      valueB: rightRow.value,
      detailB: rightRow.detail,
      kind: "metric",
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
  const lines = [`⚖️ Ref Watch Official Compare (${scopeLabel})`];
  if (left) {
    const scoring = scoringValue(left.profile, left.meta, left.config);
    lines.push(
      `📊 ${left.profile.name} (${left.config.shortLabel}): ${left.profile.games} gp · ${scoring.value} scoring · ${formatPct(left.profile.overRate)} over`,
    );
  }
  if (right) {
    const scoring = scoringValue(right.profile, right.meta, right.config);
    lines.push(
      `📊 ${right.profile.name} (${right.config.shortLabel}): ${right.profile.games} gp · ${scoring.value} scoring · ${formatPct(right.profile.overRate)} over`,
    );
  }
  lines.push("ℹ️ Descriptive tendencies only, not picks.");
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
