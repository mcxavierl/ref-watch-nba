import { formatPct, formatSigned } from "@/lib/stats-utils";

/** Section title for ref×team insights in the game preview drawer. */
export function refVsTeamsSectionLabel(crewCount: number): string {
  return crewCount === 1 ? "Ref vs teams" : "Crew vs teams";
}

export type MatchupInsightSourceRow = {
  refSlug: string;
  refName: string;
  teamAbbr: string;
  teamLabel: string;
  games: number;
  record: string;
  winRate: number;
  overRate: number;
  foulsDelta: number;
  isOutlier: boolean;
};

export type MatchupInsightMetricKind = "win-rate" | "foul-impact" | "over-rate";

export type GameSlateMatchupInsight = {
  id: string;
  refSlug: string;
  refName: string;
  teamAbbr: string;
  teamLabel: string;
  kind: MatchupInsightMetricKind;
  contextPill: string;
  title: string;
  metric: string;
  summary: string;
};

const MIN_REF_TEAM_GAMES = 5;
const MIN_WIN_RATE_OUTLIER = 0.1;
const MIN_FOUL_OUTLIER = 1.5;

function isWinRateOutlier(winRate: number, games: number): boolean {
  return games >= MIN_REF_TEAM_GAMES && Math.abs(winRate - 0.5) >= MIN_WIN_RATE_OUTLIER;
}

function isFoulOutlier(foulsDelta: number): boolean {
  return Math.abs(foulsDelta) >= MIN_FOUL_OUTLIER;
}

function isOverRateOutlier(overRate: number): boolean {
  return overRate >= 0.58 || overRate <= 0.42;
}

function matchupTitle(refName: string, teamAbbr: string): string {
  return `${refName} · ${teamAbbr}`;
}

function winRateInsight(row: MatchupInsightSourceRow): GameSlateMatchupInsight | null {
  if (!isWinRateOutlier(row.winRate, row.games)) return null;

  const pct = Math.round(row.winRate * 100);
  const lean =
    row.winRate >= 0.62
      ? `${pct}% win rate with ${row.teamAbbr}`
      : `Only ${pct}% win rate with ${row.teamAbbr}`;

  return {
    id: `${row.refSlug}-${row.teamAbbr}-win-rate`,
    refSlug: row.refSlug,
    refName: row.refName,
    teamAbbr: row.teamAbbr,
    teamLabel: row.teamLabel,
    kind: "win-rate",
    contextPill: "Win Rate",
    title: matchupTitle(row.refName, row.teamAbbr),
    metric: `${pct}%`,
    summary: `${lean} · ${row.record} in ${row.games} games`,
  };
}

function foulImpactInsight(row: MatchupInsightSourceRow): GameSlateMatchupInsight | null {
  if (!isFoulOutlier(row.foulsDelta)) return null;

  const signed = formatSigned(row.foulsDelta);
  const direction =
    row.foulsDelta > 0
      ? `${signed} more fouls on ${row.teamAbbr} per game`
      : `${signed} fewer fouls on ${row.teamAbbr} per game`;

  return {
    id: `${row.refSlug}-${row.teamAbbr}-foul-impact`,
    refSlug: row.refSlug,
    refName: row.refName,
    teamAbbr: row.teamAbbr,
    teamLabel: row.teamLabel,
    kind: "foul-impact",
    contextPill: "Foul Impact",
    title: matchupTitle(row.refName, row.teamAbbr),
    metric: signed,
    summary: `${direction} vs this crew's usual whistle profile`,
  };
}

function overRateInsight(row: MatchupInsightSourceRow): GameSlateMatchupInsight | null {
  if (!isOverRateOutlier(row.overRate)) return null;

  const rate = formatPct(row.overRate);
  const lean =
    row.overRate >= 0.58
      ? `Games trend over the total with ${row.teamAbbr}`
      : `Games trend under the total with ${row.teamAbbr}`;

  return {
    id: `${row.refSlug}-${row.teamAbbr}-over-rate`,
    refSlug: row.refSlug,
    refName: row.refName,
    teamAbbr: row.teamAbbr,
    teamLabel: row.teamLabel,
    kind: "over-rate",
    contextPill: "Over Rate",
    title: matchupTitle(row.refName, row.teamAbbr),
    metric: rate,
    summary: `${lean} · ${row.record} sample`,
  };
}

const INSIGHT_BUILDERS = [winRateInsight, foulImpactInsight, overRateInsight] as const;

/** Build compact scouting cards for ref×team outliers in the game preview drawer. */
export function buildGameSlateMatchupInsights(
  refTeamRows: MatchupInsightSourceRow[],
): GameSlateMatchupInsight[] {
  const insights: GameSlateMatchupInsight[] = [];

  for (const row of refTeamRows) {
    if (!row.isOutlier) continue;
    for (const build of INSIGHT_BUILDERS) {
      const insight = build(row);
      if (insight) insights.push(insight);
    }
  }

  return insights.sort((a, b) => {
    const kindOrder: Record<MatchupInsightMetricKind, number> = {
      "win-rate": 0,
      "foul-impact": 1,
      "over-rate": 2,
    };
    const kindDelta = kindOrder[a.kind] - kindOrder[b.kind];
    if (kindDelta !== 0) return kindDelta;
    return a.title.localeCompare(b.title);
  });
}
