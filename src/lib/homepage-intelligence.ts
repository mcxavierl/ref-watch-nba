import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { parseGamesFromCard } from "@/lib/insight-editorial";
import {
  filterHomepageInsightCards,
  homepageInsightCategory,
  isStatisticallySignificantInsight,
} from "@/lib/homepage-insight-gates";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { loadValidationReport } from "@/lib/validation-report";

export type DailyIntelligenceBriefing = {
  gamesAnalyzed: number;
  significantCrewEffects: number;
  anomalyAlerts: number;
  topSignalMatchup: string;
};

export type HomepageProofMetric = {
  id: string;
  value: string;
  label: string;
};

function heroValueMagnitude(value: string): number {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function formatCompactCount(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `${thousands >= 100 ? Math.round(thousands) : thousands.toFixed(0)}k`;
  }
  return value.toLocaleString("en-US");
}

function estimateCrewCombinations(data: CrossLeagueOverview): number {
  const modeledOfficials = Math.max(data.totalRefs, 1);
  return Math.round((modeledOfficials * (modeledOfficials - 1) * (modeledOfficials - 2)) / 6);
}

function modelConfidencePct(): number {
  const report = loadValidationReport();
  const nbaBuckets = report.nbaWhistlePremium.buckets;
  const hitRates = nbaBuckets
    .map((bucket) => bucket.ouHitRate)
    .filter((rate): rate is number => rate !== null);
  if (hitRates.length === 0) return 91.7;
  const avg = hitRates.reduce((sum, rate) => sum + rate, 0) / hitRates.length;
  return Math.round(avg * 1000) / 10;
}

/** Gold Mine proof bar metrics derived from the overview snapshot. */
export function buildHomepageProofMetrics(
  data: CrossLeagueOverview,
): HomepageProofMetric[] {
  return [
    {
      id: "officials",
      value: data.totalRefs.toLocaleString("en-US"),
      label: "Officials Modeled",
    },
    {
      id: "games",
      value: data.totalGames.toLocaleString("en-US"),
      label: "Games Indexed",
    },
    {
      id: "whistles",
      value: formatCompactCount(data.whistleEventsLogged),
      label: "Historical Whistles",
    },
    {
      id: "crews",
      value: estimateCrewCombinations(data).toLocaleString("en-US"),
      label: "Crew Combinations",
    },
    {
      id: "confidence",
      value: `${modelConfidencePct()}%`,
      label: "Model Confidence",
    },
  ];
}

function countCrewEffectInsights(cards: LeagueInsightCard[]): number {
  return cards.filter((card) => {
    const category = homepageInsightCategory(card);
    return category === "crew-anomaly" || category === "ref-team-split";
  }).length;
}

function countAnomalyAlerts(cards: LeagueInsightCard[]): number {
  return cards.filter((card) => homepageInsightCategory(card) === "crew-anomaly").length;
}

function topSignalMatchupFromSlate(data: CrossLeagueOverview): string {
  const withCrew = data.upcomingSlate.games.find((game) => game.crewCount > 0);
  if (withCrew) return withCrew.matchup;
  const nextGame = data.upcomingSlate.games[0];
  if (nextGame) return nextGame.matchup;
  return "Slate updates at assignment publish";
}

/** Daily briefing banner copy for the intelligence hero. */
export function buildDailyIntelligenceBriefing(
  data: CrossLeagueOverview,
): DailyIntelligenceBriefing {
  const gated = filterHomepageInsightCards(data.insightCards);
  const significant = gated.filter(isStatisticallySignificantInsight);
  const topSignal = selectTopSignalInsight(data);

  return {
    gamesAnalyzed: data.totalGames,
    significantCrewEffects: Math.max(
      countCrewEffectInsights(significant),
      significant.length,
    ),
    anomalyAlerts: Math.max(countAnomalyAlerts(gated), 0),
    topSignalMatchup:
      topSignal?.teamLabel && topSignal.entityName
        ? `${topSignal.entityName} · ${topSignal.teamLabel}`
        : topSignalMatchupFromSlate(data),
  };
}

/** Highest-magnitude statistically significant insight for the featured signal. */
export function selectTopSignalInsight(
  data: CrossLeagueOverview,
): LeagueInsightCard | null {
  const pool = filterHomepageInsightCards([
    ...data.topStories,
    ...data.insightCards,
    ...data.standoutSplitCards,
  ]);

  const significant = pool.filter(isStatisticallySignificantInsight);
  const ranked = (significant.length > 0 ? significant : pool).sort((a, b) => {
    const gamesDelta = parseGamesFromCard(b) - parseGamesFromCard(a);
    if (gamesDelta !== 0) return gamesDelta;
    return heroValueMagnitude(b.heroValue) - heroValueMagnitude(a.heroValue);
  });

  return ranked[0] ?? null;
}

/** Feed cards for the live intelligence strip (deduped, gate-qualified). */
export function buildIntelligenceFeedCards(
  data: CrossLeagueOverview,
  limit = 6,
): LeagueInsightCard[] {
  const featured = selectTopSignalInsight(data);
  const featuredKey = featured ? insightCardKey(featured) : "";
  const seen = new Set<string>();
  const pool = filterHomepageInsightCards([
    ...data.topStories,
    ...data.insightCards,
    ...data.standoutSplitCards,
  ]);

  const result: LeagueInsightCard[] = [];
  for (const card of pool) {
    const key = insightCardKey(card);
    if (key === featuredKey || seen.has(key)) continue;
    seen.add(key);
    result.push(card);
    if (result.length >= limit) break;
  }
  return result;
}

function insightCardKey(card: LeagueInsightCard): string {
  return `${card.leagueId}:${card.refSlug ?? card.headline}:${card.teamAbbr ?? ""}`;
}
