import { loadLeagueStats } from "@/lib/load-league-stats";
import { PRO_VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
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
import { insightsViewHref } from "@/lib/insights-routes";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import {
  computeMatrixExtremes,
  formatMatrixHighlightBaseline,
  type MatrixExtremeHighlight,
} from "@/lib/ref-team-matrix";
import { computeRefTeamMatrix } from "@/lib/ref-team-matrix-compute";
import { insightDrilldownId } from "@/lib/insight-drilldown-types";
import { formatBaselinePct, formatPct, formatSigned } from "@/lib/stats-utils";
import { sportCopy } from "@/lib/user-language";
import type { LeagueInsightCard, LeagueInsightTone } from "@/lib/league-overview-insights";
import { buildLeagueInsightCards } from "@/lib/league-overview-insights";
import { EVERGREEN_TOP_STORIES } from "@/lib/insights/evergreen";
import { applyClinicalTone } from "@/lib/insights/tone-filter";
import type { RefProfile, RefStatsFile, TeamCrewSplit } from "@/lib/types";

export const TOP_STORY_LIMIT = 3;
export const WIN_RATE_OUTLIER_PP = 15;
export const FOUL_RATE_VARIANCE_PCT = 10;
export const MIN_MATRIX_GAMES = 8;
export const MIN_WHISTLE_REF_GAMES = 50;

export type TopStoriesStatus = "generated" | "fallback";

export type InsightOutlierKind = "win-rate" | "whistle-pace";

export type InsightOutlierCandidate = {
  leagueId: (typeof PRO_VERIFIED_LIVE_LEAGUE_IDS)[number];
  kind: InsightOutlierKind;
  significance: number;
  refSlug: string;
  refName: string;
  teamAbbr?: string;
  teamLabel?: string;
  matrix?: MatrixExtremeHighlight;
  ref?: RefProfile;
  whistleVariancePct?: number;
};

export type OverviewInsightsPayload = {
  generatedAt: string;
  cards: LeagueInsightCard[];
  topStories: LeagueInsightCard[];
  topStoriesStatus: TopStoriesStatus;
};

type LeagueGeneratorSetup = {
  leagueId: (typeof PRO_VERIFIED_LIVE_LEAGUE_IDS)[number];
  teams: { abbr: string; label: string; name: string; nbaId?: number }[];
  getTeamSplits: (abbr: string) => TeamCrewSplit[];
  matrixLeague: "nba" | "nhl" | "nfl" | "epl" | "laliga";
};

const LEAGUE_SETUP: Record<
  (typeof PRO_VERIFIED_LIVE_LEAGUE_IDS)[number],
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

function leaguePrefix(leagueId: LeagueId): string {
  return LEAGUES[leagueId].pathPrefix;
}

function refHref(leagueId: LeagueId, slug: string): string {
  return `${leaguePrefix(leagueId)}/refs/${slug}`;
}

function matrixHref(leagueId: LeagueId): string {
  return `${leaguePrefix(leagueId)}/matrix`;
}

function trendsHref(leagueId: (typeof PRO_VERIFIED_LIVE_LEAGUE_IDS)[number]): string {
  return insightsViewHref(leagueId, "trends");
}

function formatDeltaPts(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}pp`;
}

function heroToneFromDelta(delta: number): LeagueInsightTone {
  if (delta >= WIN_RATE_OUTLIER_PP) return "positive";
  if (delta <= -WIN_RATE_OUTLIER_PP) return "negative";
  return "neutral";
}

function whistleVariancePct(ref: RefProfile, stats: RefStatsFile): number {
  const baseline = Math.max(stats.meta.leagueAvgFouls, 0.01);
  return (Math.abs(ref.foulsDelta) / baseline) * 100;
}

function leaguePaceWhistlePerGame(stats: RefStatsFile): number {
  return stats.meta.leagueAvgFouls ?? 0;
}

export function scanLeagueOutliers(
  leagueId: (typeof PRO_VERIFIED_LIVE_LEAGUE_IDS)[number],
): InsightOutlierCandidate[] {
  const setup = LEAGUE_SETUP[leagueId];
  const { stats } = loadLeagueStats(leagueId);
  if (stats.refs.length === 0) return [];

  const candidates: InsightOutlierCandidate[] = [];

  const matrix = computeRefTeamMatrix(
    stats,
    setup.teams,
    setup.getTeamSplits,
    MIN_MATRIX_GAMES,
    { league: setup.matrixLeague },
  );

  for (const highlight of computeMatrixExtremes(matrix, 12)) {
    if (highlight.games < MIN_MATRIX_GAMES) continue;
    if (Math.abs(highlight.deltaPts) < WIN_RATE_OUTLIER_PP) continue;
    candidates.push({
      leagueId,
      kind: "win-rate",
      significance: Math.abs(highlight.deltaPts) * Math.log10(highlight.games + 1),
      refSlug: highlight.refSlug,
      refName: highlight.refName,
      teamAbbr: highlight.teamAbbr,
      teamLabel: highlight.teamLabel,
      matrix: highlight,
    });
  }

  const leagueAvg = Math.max(stats.meta.leagueAvgFouls, 0.01);
  for (const ref of stats.refs) {
    if (ref.games < MIN_WHISTLE_REF_GAMES) continue;
    const variancePct = whistleVariancePct(ref, stats);
    if (variancePct < FOUL_RATE_VARIANCE_PCT) continue;
    candidates.push({
      leagueId,
      kind: "whistle-pace",
      significance: variancePct * Math.log10(ref.games + 1),
      refSlug: ref.slug,
      refName: ref.name,
      ref,
      whistleVariancePct: variancePct,
    });
  }

  void leaguePaceWhistlePerGame(stats);
  void leagueAvg;

  return candidates;
}

export function scanAllProLeagueOutliers(): InsightOutlierCandidate[] {
  const all: InsightOutlierCandidate[] = [];
  for (const leagueId of PRO_VERIFIED_LIVE_LEAGUE_IDS) {
    all.push(...scanLeagueOutliers(leagueId));
  }
  return all.sort((a, b) => b.significance - a.significance);
}

function winRateHeadline(
  candidate: InsightOutlierCandidate,
  leagueLabel: string,
): string {
  const highlight = candidate.matrix!;
  const pct = Math.abs(highlight.deltaPts).toFixed(1);
  const direction = highlight.deltaPts > 0 ? "above" : "below";
  return applyClinicalTone(
    `${highlight.refName} is showing a ${pct}% win-rate outlier ${direction} the ${highlight.teamLabel} baseline in ${leagueLabel} games`,
  );
}

function whistleHeadline(
  candidate: InsightOutlierCandidate,
  leagueLabel: string,
  whistleUnit: string,
): string {
  const ref = candidate.ref!;
  const variance = candidate.whistleVariancePct!.toFixed(1);
  const direction = ref.foulsDelta > 0 ? "above" : "below";
  return applyClinicalTone(
    `${ref.name} is pacing ${variance}% ${direction} league average for ${whistleUnit} in ${leagueLabel}`,
  );
}

export function candidateToInsightCard(candidate: InsightOutlierCandidate): LeagueInsightCard {
  const config = LEAGUES[candidate.leagueId];
  const copy = sportCopy(candidate.leagueId);

  if (candidate.kind === "win-rate" && candidate.matrix) {
    const highlight = candidate.matrix;
    const splitPct = formatPct(highlight.winRate);
    const baselinePct = formatBaselinePct(
      highlight.baselineGames,
      highlight.baselineWinRate,
    );
    const deltaLabel = formatDeltaPts(highlight.deltaPts);

    return {
      leagueId: candidate.leagueId,
      label: config.label,
      shortLabel: config.shortLabel,
      kind: "matrix-edge",
      kicker: "Statistically significant ref×team split",
      headline: winRateHeadline(candidate, config.shortLabel),
      story: applyClinicalTone(
        `${highlight.wins}-${highlight.losses} (${splitPct}) across ${highlight.games} games. Team sample without this official: ${baselinePct} (${formatMatrixHighlightBaseline(highlight)}).`,
      ),
      heroValue: deltaLabel,
      heroLabel: "Win rate vs team baseline",
      heroTone: heroToneFromDelta(highlight.deltaPts),
      stats: [
        { label: "Ref×team record", value: `${highlight.wins}-${highlight.losses}` },
        { label: "Games", value: String(highlight.games) },
        { label: "Team baseline", value: baselinePct },
      ],
      links: [
        { label: "Open matrix", href: matrixHref(candidate.leagueId) },
        { label: "Ref profile", href: refHref(candidate.leagueId, highlight.refSlug) },
        { label: "League trends", href: trendsHref(candidate.leagueId) },
      ],
      entityName: highlight.refName,
      entityHref: refHref(candidate.leagueId, highlight.refSlug),
      teamLabel: highlight.teamLabel,
      refSlug: highlight.refSlug,
      teamAbbr: highlight.teamAbbr,
      drilldownId: insightDrilldownId(
        candidate.leagueId,
        highlight.refSlug,
        highlight.teamAbbr,
      ),
    };
  }

  const ref = candidate.ref!;
  const varianceLabel = `${candidate.whistleVariancePct!.toFixed(1)}%`;

  return {
    leagueId: candidate.leagueId,
    label: config.label,
    shortLabel: config.shortLabel,
    kind: "ref-outlier",
    kicker: "Whistle pace outlier",
    headline: whistleHeadline(candidate, config.shortLabel, copy.whistleUnit),
    story: applyClinicalTone(
      `${ref.name} averages ${ref.avgFouls} ${copy.whistleUnit} per game (${formatSigned(ref.foulsDelta)} vs league) across ${ref.games} verified games.`,
    ),
    heroValue: varianceLabel,
    heroLabel: `${copy.whistleUnit} variance vs league`,
    heroTone: ref.foulsDelta > 0 ? "positive" : "negative",
    stats: [
      { label: `${copy.whistleUnit} per game`, value: String(ref.avgFouls) },
      { label: "Vs league avg", value: formatSigned(ref.foulsDelta) },
      { label: "Sample", value: `${ref.games} games` },
    ],
    links: [
      { label: "Ref profile", href: refHref(candidate.leagueId, ref.slug) },
      { label: "League findings", href: insightsViewHref(candidate.leagueId, "findings") },
      { label: `${config.shortLabel} hub`, href: leaguePrefix(candidate.leagueId) || "/" },
    ],
    entityName: ref.name,
    entityHref: refHref(candidate.leagueId, ref.slug),
    refSlug: ref.slug,
  };
}

function dedupeCards(cards: LeagueInsightCard[]): LeagueInsightCard[] {
  const seen = new Set<string>();
  const out: LeagueInsightCard[] = [];
  for (const card of cards) {
    const key = `${card.leagueId}:${card.refSlug ?? card.headline}:${card.teamAbbr ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(card);
  }
  return out;
}

export function generateTopStories(limit = TOP_STORY_LIMIT): {
  stories: LeagueInsightCard[];
  status: TopStoriesStatus;
} {
  const candidates = scanAllProLeagueOutliers();
  const generated = dedupeCards(candidates.map(candidateToInsightCard)).slice(0, limit);

  if (generated.length >= limit) {
    return { stories: generated, status: "generated" };
  }

  if (generated.length > 0) {
    const filler = EVERGREEN_TOP_STORIES.filter(
      (card) => !generated.some((g) => g.leagueId === card.leagueId),
    );
    const merged = dedupeCards([...generated, ...filler]).slice(0, limit);
    return { stories: merged, status: merged.length === generated.length ? "generated" : "fallback" };
  }

  return {
    stories: EVERGREEN_TOP_STORIES.slice(0, limit),
    status: "fallback",
  };
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
  return (PRO_VERIFIED_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}
