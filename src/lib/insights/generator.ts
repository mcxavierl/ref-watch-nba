import { loadLeagueStats } from "@/lib/load-league-stats";
import { PRO_MATRIX_ANALYTICS_LEAGUE_IDS } from "@/lib/league-verification";
import { getTeamSplits as getEplTeamSplits } from "@/lib/epl/data";
import { EPL_TEAMS, teamFullName as eplTeamFullName } from "@/lib/epl/teams";
import { getTeamSplits as getLaligaTeamSplits } from "@/lib/laliga/data";
import { LALIGA_TEAMS, teamFullName as laligaTeamFullName } from "@/lib/laliga/teams";
import { getTeamSplits as getNflTeamSplits } from "@/lib/nfl/data";
import { NFL_TEAMS, teamFullName as nflTeamFullName } from "@/lib/nfl/teams";
import { getTeamSplits as getNhlTeamSplits } from "@/lib/nhl/data";
import { NHL_TEAMS, teamFullName as nhlTeamFullName } from "@/lib/nhl/teams";
import { getTeamSplits as getNbaTeamSplits } from "@/lib/data";
import { NBA_TEAMS, teamFullName as nbaTeamFullName } from "@/lib/teams";
import type { LeagueId } from "@/lib/leagues";
import { formatPct } from "@/lib/stats-utils";
import { applyClinicalTone } from "@/lib/insights/tone-filter";
import type { TeamInsight } from "@/lib/team-insights";
import type { RefStatsFile } from "@/lib/types";
import { formatSigned } from "@/lib/stats-utils";
import { buildLeagueInsightCards } from "@/lib/league-overview-insights";
import {
  generateTopStoriesFromCandidates,
  scanLeagueOutliersFromSlim,
  TOP_STORY_LIMIT,
  type InsightOutlierCandidate,
  type LeagueGeneratorSetup,
  type OverviewInsightsPayload,
  type TopStoriesStatus,
} from "@/lib/insights/generator-core";
import {
  stripRefProfileForInsights,
  type SlimLeagueStats,
} from "@/lib/insights/insight-input-slim";

export {
  candidateToInsightCard,
  dedupeCards,
  FOUL_RATE_VARIANCE_PCT,
  generateTopStoriesFromCandidates,
  MIN_MATRIX_GAMES,
  MIN_WHISTLE_REF_GAMES,
  scanLeagueOutliersFromSlim,
  TOP_STORY_LIMIT,
  WIN_RATE_OUTLIER_PP,
} from "@/lib/insights/generator-core";
export type {
  InsightOutlierCandidate,
  InsightOutlierKind,
  OverviewInsightsPayload,
  TopStoriesStatus,
} from "@/lib/insights/generator-core";

const LEAGUE_SETUP: Record<
  (typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number],
  LeagueGeneratorSetup
> = {
  nba: {
    leagueId: "nba",
    teams: NBA_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: nbaTeamFullName(team),
      name: team.name,
    })),
    getTeamSplits: getNbaTeamSplits,
    matrixLeague: "nba",
  },
  nhl: {
    leagueId: "nhl",
    teams: NHL_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: nhlTeamFullName(team),
      name: team.name,
    })),
    getTeamSplits: getNhlTeamSplits,
    matrixLeague: "nhl",
  },
  nfl: {
    leagueId: "nfl",
    teams: NFL_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: nflTeamFullName(team),
      name: team.name,
    })),
    getTeamSplits: getNflTeamSplits,
    matrixLeague: "nfl",
  },
  epl: {
    leagueId: "epl",
    teams: EPL_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: eplTeamFullName(team),
      name: team.name,
    })),
    getTeamSplits: getEplTeamSplits,
    matrixLeague: "epl",
  },
  laliga: {
    leagueId: "laliga",
    teams: LALIGA_TEAMS.map((team) => ({
      abbr: team.abbr,
      label: laligaTeamFullName(team),
      name: team.name,
    })),
    getTeamSplits: getLaligaTeamSplits,
    matrixLeague: "laliga",
  },
};

function statsToSlim(stats: RefStatsFile): SlimLeagueStats {
  return {
    meta: stats.meta,
    refs: stats.refs.map(stripRefProfileForInsights),
    teamAtsBaselines: stats.teamAtsBaselines,
  };
}

export function scanLeagueOutliers(
  leagueId: (typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number],
): InsightOutlierCandidate[] {
  const setup = LEAGUE_SETUP[leagueId];
  const { stats } = loadLeagueStats(leagueId);
  return scanLeagueOutliersFromSlim(statsToSlim(stats), setup);
}

export function scanAllProLeagueOutliers(): InsightOutlierCandidate[] {
  const all: InsightOutlierCandidate[] = [];
  for (const leagueId of PRO_MATRIX_ANALYTICS_LEAGUE_IDS) {
    all.push(...scanLeagueOutliers(leagueId));
  }
  return all.sort((a, b) => b.significance - a.significance);
}

export function generateTopStories(limit = TOP_STORY_LIMIT): {
  stories: import("@/lib/league-overview-insights").LeagueInsightCard[];
  status: TopStoriesStatus;
} {
  return generateTopStoriesFromCandidates(scanAllProLeagueOutliers(), limit);
}

export function generateOverviewInsightsPayload(): OverviewInsightsPayload {
  const cards = buildLeagueInsightCards();
  const { stories, status } = generateTopStories();

  return {
    generatedAt: new Date().toISOString(),
    cards,
    topStories: stories,
    topStoriesStatus: status,
  };
}

/** Pro-league scope guard for ingest + generator pipelines. */
export function isAllowedInsightLeague(leagueId: LeagueId): boolean {
  return (PRO_MATRIX_ANALYTICS_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

export type TeamTopFinding = {
  headline: string;
  body: string;
  refSlug?: string;
  refName?: string;
  category: "win-rate" | "whistle-pace" | "team-insight";
  heroValue?: string;
  sampleGames?: number;
};

function formatDeltaPts(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}pp`;
}

function teamTopFindingFromOutlier(
  candidate: InsightOutlierCandidate,
): TeamTopFinding | null {
  if (candidate.kind === "win-rate" && candidate.matrix) {
    const highlight = candidate.matrix;
    const deltaLabel = formatDeltaPts(highlight.deltaPts);
    const direction = highlight.deltaPts > 0 ? "above" : "below";
    return {
      headline: applyClinicalTone(
        `${highlight.refName}: ${formatPct(highlight.winRate)} win rate ${direction} ${highlight.teamLabel} baseline`,
      ),
      body: applyClinicalTone(
        `${highlight.wins}-${highlight.losses} across ${highlight.games} games (${deltaLabel} vs team sample).`,
      ),
      refSlug: highlight.refSlug,
      refName: highlight.refName,
      category: "win-rate",
      heroValue: deltaLabel,
      sampleGames: highlight.games,
    };
  }

  if (candidate.kind === "whistle-pace" && candidate.ref) {
    const ref = candidate.ref;
    const variance = candidate.whistleVariancePct!.toFixed(1);
    return {
      headline: applyClinicalTone(
        `${ref.name}: ${variance}% whistle pace variance vs league`,
      ),
      body: applyClinicalTone(
        `${ref.avgFouls} per game (${formatSigned(ref.foulsDelta)} vs league) across ${ref.games} games.`,
      ),
      refSlug: ref.slug,
      refName: ref.name,
      category: "whistle-pace",
      heroValue: `${variance}%`,
      sampleGames: ref.games,
    };
  }

  return null;
}

function teamTopFindingFromInsight(insight: TeamInsight): TeamTopFinding {
  return {
    headline: applyClinicalTone(insight.title),
    body: applyClinicalTone(insight.body),
    refSlug: insight.refSlug,
    refName: insight.refName,
    category: "team-insight",
    sampleGames: insight.sampleGames,
  };
}

/** Most significant league or team-scoped finding for a team insight hub header. */
export function findTeamTopFinding(
  leagueId: LeagueId,
  teamAbbr: string,
  fallbackInsights?: TeamInsight[],
): TeamTopFinding | null {
  const abbr = teamAbbr.toUpperCase();

  if (isAllowedInsightLeague(leagueId)) {
    const outliers = scanLeagueOutliers(
      leagueId as (typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number],
    )
      .filter((candidate) => candidate.teamAbbr?.toUpperCase() === abbr)
      .sort((a, b) => b.significance - a.significance);

    if (outliers.length > 0) {
      const finding = teamTopFindingFromOutlier(outliers[0]!);
      if (finding) return finding;
    }
  }

  if (fallbackInsights && fallbackInsights.length > 0) {
    return teamTopFindingFromInsight(fallbackInsights[0]!);
  }

  return null;
}
