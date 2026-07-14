import type { Finding, FindingCategory } from "@/lib/findings-shared";
import { getBaselinesFile } from "@/lib/baselines";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { isOffseasonSlate } from "@/lib/offseason";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

export type LiveLeagueId = Extract<
  LeagueId,
  "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb"
>;

type BaselineLeague = "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";

export type LeagueLivePulseStatId =
  | "games-analyzed"
  | "whistle-trends"
  | "scoring-baseline";

export interface LeagueLivePulseStat {
  id: LeagueLivePulseStatId;
  label: string;
  value: string;
  caption?: string;
}

/** Categories that represent a "significant whistle" pattern (ref-outlier lens). */
const WHISTLE_SIGNIFICANT_CATEGORIES = new Set<FindingCategory>([
  "ref-outlier",
  "whistle-extreme",
  "scoring-extreme",
]);

export function countWhistleSignificantFindings(findings: Finding[]): number {
  return findings.filter((finding) =>
    WHISTLE_SIGNIFICANT_CATEGORIES.has(finding.category),
  ).length;
}

function gamesProcessedThisSeason(
  league: BaselineLeague,
  refStats: RefStatsFile,
): number {
  const file = getBaselinesFile();
  const block = file[league];
  const currentSeason = block.currentSeason;
  if (currentSeason && block.seasons[currentSeason]) {
    return block.seasons[currentSeason].gameCount;
  }
  return refStats.meta.totalGamesProcessed ?? 0;
}

function countLiveSlateGames(assignments: AssignmentsFile): number {
  return assignments.games.filter((game) => game.crew.length > 0).length;
}

interface ScoringBaselineDelta {
  value: string;
  caption: string;
}

/** Latest season leagueAvgTotal vs prior season (or multi-season weighted avg). */
function computeScoringBaselineDelta(leagueId: LiveLeagueId): ScoringBaselineDelta {
  const league = LEAGUES[leagueId].dataLeague as BaselineLeague;
  const unitPlural = LEAGUES[leagueId].metrics.scoreUnitPlural;
  const file = getBaselinesFile();
  const block = file[league];

  if (block.usingFallback || !block.currentSeason) {
    return { value: "-", caption: "Baseline unavailable" };
  }

  const currentBaseline = block.seasons[block.currentSeason];
  if (!currentBaseline) {
    return { value: "-", caption: "Baseline unavailable" };
  }

  const seasonKeys = Object.keys(block.seasons).sort();
  const currentIdx = seasonKeys.indexOf(block.currentSeason);
  const priorKey = currentIdx > 0 ? seasonKeys[currentIdx - 1] : undefined;
  const priorBaseline = priorKey ? block.seasons[priorKey] : undefined;

  let compareValue: number | null = null;
  let compareLabel = "";

  if (priorBaseline) {
    compareValue = priorBaseline.leagueAvgTotal;
    compareLabel = "prior season";
  } else {
    const otherSeasons = seasonKeys.filter((key) => key !== block.currentSeason);
    const rows = otherSeasons
      .map((key) => block.seasons[key])
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    const totalGames = rows.reduce((sum, row) => sum + row.gameCount, 0);
    if (rows.length > 0 && totalGames > 0) {
      compareValue =
        rows.reduce((sum, row) => sum + row.leagueAvgTotal * row.gameCount, 0) /
        totalGames;
      compareLabel = "multi-season average";
    }
  }

  if (compareValue == null) {
    return {
      value: `${currentBaseline.leagueAvgTotal.toFixed(1)} ${unitPlural}`,
      caption: "Current season average",
    };
  }

  const delta = currentBaseline.leagueAvgTotal - compareValue;
  const sign = delta > 0 ? "+" : "";
  return {
    value: `${sign}${delta.toFixed(1)} ${unitPlural}`,
    caption: `vs ${compareLabel} (${currentBaseline.leagueAvgTotal.toFixed(1)} now)`,
  };
}

/** Builds the 3 Live Pulse stats for a league hub — live-slate aware. */
export function buildLeagueLivePulse({
  leagueId,
  assignments,
  refStats,
  findings,
}: {
  leagueId: LiveLeagueId;
  assignments: AssignmentsFile;
  refStats: RefStatsFile;
  findings: Finding[];
}): LeagueLivePulseStat[] {
  const dataLeague = LEAGUES[leagueId].dataLeague as BaselineLeague;
  const offseason = isOffseasonSlate(assignments);

  const gamesAnalyzed = offseason
    ? gamesProcessedThisSeason(dataLeague, refStats)
    : countLiveSlateGames(assignments);

  const whistleCount = countWhistleSignificantFindings(findings);
  const scoringDelta = computeScoringBaselineDelta(leagueId);

  return [
    {
      id: "games-analyzed",
      label: "Games Analyzed Today",
      value: gamesAnalyzed > 0 ? gamesAnalyzed.toLocaleString() : "-",
      caption: offseason ? "Processed this season" : "On tonight's slate",
    },
    {
      id: "whistle-trends",
      label: "Significant Whistle Trends Detected",
      value: whistleCount > 0 ? whistleCount.toLocaleString() : "-",
      caption:
        whistleCount > 0
          ? "Ref-outlier & whistle-extreme patterns"
          : "No standout whistle patterns yet",
    },
    {
      id: "scoring-baseline",
      label: "League Scoring Baseline vs. Season Average",
      value: scoringDelta.value,
      caption: scoringDelta.caption,
    },
  ];
}
