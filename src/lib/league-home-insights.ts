import { computeCrewMetrics, ouLeanSortWeight } from "@/lib/data";
import { resolveSlateGames } from "@/lib/grudge-match";
import { insightsViewHref } from "@/lib/insights-routes";
import { LEAGUES, type LeagueConfig, type LeagueId } from "@/lib/leagues";
import {
  buildTopMatrixSplitCardForLeague,
  type LeagueInsightCard,
} from "@/lib/league-overview-insights";
import { PRO_VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import {
  buildRankingsSynthesis,
  type RankingsInsight,
} from "@/lib/rankings-synthesis";
import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

export type LeagueHomeInsights = {
  pulse: RankingsInsight[];
  matchups: RankingsInsight[];
  spotlights: RankingsInsight[];
};

export const LEAGUE_PULSE_LIMIT = 3;
export const LEAGUE_MATCHUP_LIMIT = 4;
export const LEAGUE_SPOTLIGHT_LIMIT = 4;

const PULSE_SLOT_ORDER = [
  "top-whistle",
  "top-ou-betting",
  "top-over",
  "top-ats",
] as const;

const PULSE_SLOT_TITLES: Record<string, string> = {
  "top-whistle": "Highest whistle bias",
  "top-ou-betting": "Extreme O/U divergence",
  "top-over": "Extreme over/under divergence",
  "top-ats": "Extreme ATS divergence",
  "ref-team-split": "Ref-team split alert",
  "marquee-matchup": "Key matchup target",
};

function withPulseTitle(insight: RankingsInsight, titleKey: string): RankingsInsight {
  return {
    ...insight,
    title: PULSE_SLOT_TITLES[titleKey] ?? insight.title,
  };
}

function matrixCardToInsight(
  card: LeagueInsightCard,
  basePath: string,
): RankingsInsight {
  return {
    id: `ref-team-split-${card.refSlug ?? "unknown"}-${card.teamAbbr ?? "team"}`,
    title: PULSE_SLOT_TITLES["ref-team-split"]!,
    body: card.headline,
    refSlug: card.refSlug,
    refName: card.entityName,
    statLabel: card.heroLabel,
    statValue: card.heroValue,
    categoryHref: card.entityHref ?? `${basePath}/matrix`,
  };
}

function pickPulseInsight(
  synthesis: ReturnType<typeof buildRankingsSynthesis>,
  slotId: string,
): RankingsInsight | undefined {
  return synthesis.insights.find((insight) => insight.id === slotId);
}

export function buildLeaguePulseInsights(
  stats: RefStatsFile,
  league: LeagueConfig,
): RankingsInsight[] {
  const synthesis = buildRankingsSynthesis(stats, league, {
    maxCards: 8,
  });
  const pulse: RankingsInsight[] = [];
  const usedSlugs = new Set<string>();

  for (const slotId of PULSE_SLOT_ORDER) {
    if (pulse.length >= LEAGUE_PULSE_LIMIT) break;
    const insight = pickPulseInsight(synthesis, slotId);
    if (!insight?.refSlug || usedSlugs.has(insight.refSlug)) continue;
    usedSlugs.add(insight.refSlug);
    pulse.push(withPulseTitle(insight, slotId));
  }

  if (
    pulse.length < LEAGUE_PULSE_LIMIT &&
    PRO_VERIFIED_LIVE_LEAGUE_IDS.includes(league.id as (typeof PRO_VERIFIED_LIVE_LEAGUE_IDS)[number])
  ) {
    const matrixCard = buildTopMatrixSplitCardForLeague(
      league.id as (typeof PRO_VERIFIED_LIVE_LEAGUE_IDS)[number],
      stats,
    );
    if (matrixCard?.refSlug && !usedSlugs.has(matrixCard.refSlug)) {
      pulse.push(matrixCardToInsight(matrixCard, league.pathPrefix));
      usedSlugs.add(matrixCard.refSlug);
    }
  }

  for (const insight of synthesis.insights) {
    if (pulse.length >= LEAGUE_PULSE_LIMIT) break;
    if (!insight.refSlug || usedSlugs.has(insight.refSlug)) continue;
    usedSlugs.add(insight.refSlug);
    pulse.push(insight);
  }

  return pulse.slice(0, LEAGUE_PULSE_LIMIT);
}

function formatOuLeanLabel(lean: "over" | "under" | "neutral"): string {
  if (lean === "over") return "Over lean";
  if (lean === "under") return "Under lean";
  return "Neutral";
}

export function buildKeyMatchupTargets(
  leagueId: LeagueId,
  assignments: AssignmentsFile,
  refStats: RefStatsFile,
  basePath: string,
  limit = LEAGUE_MATCHUP_LIMIT,
): RankingsInsight[] {
  const { games } = resolveSlateGames(assignments);
  const pool = games.length > 0 ? games : [...(assignments.scheduledGames ?? [])];

  const scored = pool
    .map((game) => {
      const metrics =
        game.crew.length > 0 ? computeCrewMetrics(game.crew, refStats) : null;
      const leanWeight = metrics ? ouLeanSortWeight(metrics.ouLean) : 0;
      const crewBonus = game.crew.length > 0 ? 2 : 0;
      return { game, metrics, score: leanWeight + crewBonus };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ game, metrics }) => {
    const crewLabel =
      game.crew.length > 0
        ? game.crew.map((official) => official.name).join(", ")
        : "Crew TBD";
    const lean = metrics?.ouLean ?? "neutral";
    return {
      id: `marquee-matchup-${game.id}`,
      title: PULSE_SLOT_TITLES["marquee-matchup"]!,
      body: `${game.matchup} · ${formatOuLeanLabel(lean)} with ${crewLabel}. High-leverage slate target for split tracking.`,
      statLabel: "O/U lean",
      statValue: formatOuLeanLabel(lean),
      categoryHref: `${basePath}/#slate-game-${game.id}`,
    };
  });
}

export function buildOfficialSpotlights(
  stats: RefStatsFile,
  league: LeagueConfig,
  excludeSlugs: ReadonlySet<string>,
  limit = LEAGUE_SPOTLIGHT_LIMIT,
): RankingsInsight[] {
  const synthesis = buildRankingsSynthesis(stats, league, { maxCards: 10 });
  return synthesis.insights
    .filter((insight) => insight.refSlug && !excludeSlugs.has(insight.refSlug))
    .slice(0, limit)
    .map((insight) => ({
      ...insight,
      categoryHref:
        insight.categoryHref ??
        `${league.pathPrefix}/refs/${insight.refSlug}`,
    }));
}

export function buildLeagueHomeInsights({
  leagueId,
  refStats,
  assignments,
}: {
  leagueId: LeagueId;
  refStats: RefStatsFile;
  assignments: AssignmentsFile;
}): LeagueHomeInsights {
  const league = LEAGUES[leagueId];
  const pulse = buildLeaguePulseInsights(refStats, league);
  const pulseSlugs = new Set(
    pulse.map((insight) => insight.refSlug).filter(Boolean) as string[],
  );
  const matchups = buildKeyMatchupTargets(
    leagueId,
    assignments,
    refStats,
    league.pathPrefix,
  );
  const spotlights = buildOfficialSpotlights(refStats, league, pulseSlugs);

  return { pulse, matchups, spotlights };
}

export function leagueHomeInsightsHref(
  leagueId: Extract<LeagueId, "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb">,
): string {
  return insightsViewHref(leagueId, "tendencies");
}
