import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { isLeagueAnalyticsUnlocked } from "@/config/leagues";
import { DASHBOARD_GRID_LEAGUE_IDS } from "@/config/leagues";
import { qualifiesRefAnomaly } from "@/lib/anomaly-surface";
import { parseGamesFromCard } from "@/lib/insight-editorial";
import {
  filterHomepageInsightCards,
  homepageInsightCategory,
  isStatisticallySignificantInsight,
} from "@/lib/homepage-insight-gates";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { loadLeagueStats } from "@/lib/load-league-stats";
import { twoProportionZTest } from "@/lib/metric-significance";
import { countNotableSignals } from "@/lib/profile-signals";
import { qualifiedRefs } from "@/lib/rankings";
import { loadValidationReport } from "@/lib/validation-report";
import { dataMaturityPercent } from "@/lib/data-maturity";

export type DailyIntelligenceBriefing = {
  gamesAnalyzed: number;
  significantCrewEffects: number;
  anomalyAlerts: number;
  topSignalMatchup: string;
};

export type IntelligenceHeroProofMetric = {
  id: string;
  label: string;
  value: string;
  icon: "activity" | "layers" | null;
};

export type IntelligenceHeroView = {
  gamesAnalyzed: number;
  significantCrewEffects: number;
  anomalyAlerts: number;
  modelCertaintyPct: number;
  topMatchup: string;
  topSignalConfidence: number;
  topSignalNote: string;
  topSignalHref: string;
  proofMetrics: IntelligenceHeroProofMetric[];
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

function slateGamesAnalyzed(data: CrossLeagueOverview): number {
  const { upcomingSlate } = data;
  if (upcomingSlate.inSeason) {
    return Math.max(
      upcomingSlate.games.length,
      upcomingSlate.totalGames + upcomingSlate.totalScheduled,
    );
  }
  return Math.max(data.liveLeagueCount, 1);
}

function heroTopMatchup(data: CrossLeagueOverview, topSignal: LeagueInsightCard | null): string {
  const slateGame =
    data.upcomingSlate.games.find((game) => game.crewCount > 0) ??
    data.upcomingSlate.games[0];
  if (slateGame) {
    return slateGame.matchup.replace(/\s+at\s+/i, " @ ");
  }
  if (topSignal?.teamLabel && topSignal.entityName) {
    return `${shortTeamLabel(topSignal.teamLabel)} + ${topSignal.entityName}`;
  }
  return topSignalMatchupFromSlate(data);
}

function heroTopSignalNote(topSignal: LeagueInsightCard | null): string {
  if (!topSignal) {
    return "Crew and matchup intelligence updates as assignments publish.";
  }
  if (topSignal.story.trim()) {
    return topSignal.story.trim();
  }
  return `${topSignal.heroValue} ${topSignal.heroLabel.toLowerCase()} in the current sample.`;
}

/** Intelligence hero banner + integrated proof bar view model. */
export function buildIntelligenceHeroView(data: CrossLeagueOverview): IntelligenceHeroView {
  const briefing = buildDailyIntelligenceBriefing(data);
  const topSignalCard = selectTopSignalInsight(data);
  const topSignal = buildTopSignalView(data);

  return {
    gamesAnalyzed: slateGamesAnalyzed(data),
    significantCrewEffects: briefing.significantCrewEffects,
    anomalyAlerts: briefing.anomalyAlerts,
    modelCertaintyPct: modelConfidencePct(),
    topMatchup: heroTopMatchup(data, topSignalCard),
    topSignalConfidence: topSignalCard
      ? signalConfidencePct(topSignalCard)
      : modelConfidencePct(),
    topSignalNote: heroTopSignalNote(topSignalCard),
    topSignalHref: topSignal?.href ?? "/",
    proofMetrics: [
      {
        id: "officials",
        label: "OFFICIALS MODELED",
        value: `${data.totalRefs.toLocaleString("en-US")} Active`,
        icon: "activity",
      },
      {
        id: "games",
        label: "INDEXED GAMES",
        value: data.totalGames.toLocaleString("en-US"),
        icon: "layers",
      },
      {
        id: "whistles",
        label: "HISTORICAL WHISTLES",
        value: data.whistleEventsLogged.toLocaleString("en-US"),
        icon: null,
      },
      {
        id: "crews",
        label: "CREW COMBINATIONS",
        value: estimateCrewCombinations(data).toLocaleString("en-US"),
        icon: null,
      },
    ],
  };
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
  return countRefAnomalyAlerts();
}

/** Officials across live leagues that pass the strict anomaly gate. */
export function countRefAnomalyAlerts(): number {
  let total = 0;
  for (const leagueId of DASHBOARD_GRID_LEAGUE_IDS) {
    const { stats } = loadLeagueStats(leagueId);
    if (!isLeagueAnalyticsUnlocked(leagueId, stats)) continue;
    const pool = qualifiedRefs(stats.refs, stats.meta.minSampleSize);
    for (const ref of pool) {
      const notable = countNotableSignals(ref, stats.meta, leagueId as LeagueId);
      if (qualifiesRefAnomaly(ref, leagueId as LeagueId, notable)) {
        total += 1;
      }
    }
  }
  return total;
}

function insightCardQualifiesAsAnomalyAlert(card: LeagueInsightCard): boolean {
  if (!card.refSlug) return false;
  const leagueId = card.leagueId as LeagueId;
  if (!(leagueId in LEAGUES)) return false;
  const { stats } = loadLeagueStats(leagueId);
  const ref = stats.refs.find((row) => row.slug === card.refSlug);
  if (!ref) return false;
  const notable = countNotableSignals(ref, stats.meta, leagueId);
  return qualifiesRefAnomaly(ref, leagueId, notable);
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

export type TopSignalView = {
  percentile: number;
  percentileLabel: string;
  matchupTitle: string;
  statBreakdown: string;
  href: string;
  leagueLabel: string;
  headline: string;
};

function shortTeamLabel(teamLabel?: string): string {
  if (!teamLabel) return "Matchup";
  const parts = teamLabel.trim().split(/\s+/);
  return parts[parts.length - 1] ?? teamLabel;
}

function ordinalPercentile(value: number): string {
  const n = Math.max(1, Math.min(99, Math.round(value)));
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function signalPercentile(card: LeagueInsightCard): number {
  const counts = card.significance;
  if (counts) {
    const test = twoProportionZTest(
      counts.refWins,
      counts.refGames,
      counts.baselineWins,
      counts.baselineGames,
    );
    const absZ = Math.abs(test.z);
    if (absZ >= 2.58) return 99;
    if (absZ >= 2.33) return 98;
    if (absZ >= 1.96) return 95;
    if (absZ >= 1.65) return 90;
    return Math.min(89, Math.round(50 + absZ * 14));
  }

  const games = parseGamesFromCard(card);
  return Math.min(
    97,
    Math.max(62, Math.round(55 + heroValueMagnitude(card.heroValue) * 0.75 + games * 0.9)),
  );
}

function signalConfidencePct(card: LeagueInsightCard): number {
  const counts = card.significance;
  if (counts) {
    const test = twoProportionZTest(
      counts.refWins,
      counts.refGames,
      counts.baselineWins,
      counts.baselineGames,
    );
    return Math.min(99, Math.max(55, Math.round((1 - test.pValue) * 100)));
  }
  return Math.min(99, Math.max(60, dataMaturityPercent(parseGamesFromCard(card))));
}

function formatPpdValue(card: LeagueInsightCard): string {
  const raw = card.heroValue.trim();
  if (/pp|ppd/i.test(raw)) return raw.replace(/pp/i, "PPD");
  if (raw.includes("%")) return raw;
  return `${raw} PPD`;
}

/** Featured top-signal hero card view model. */
export function buildTopSignalView(data: CrossLeagueOverview): TopSignalView | null {
  const card = selectTopSignalInsight(data);
  if (!card) return null;

  const percentile = signalPercentile(card);
  const sampleGames = parseGamesFromCard(card);
  const confidence = signalConfidencePct(card);
  const team = shortTeamLabel(card.teamLabel);
  const official = card.entityName ?? card.headline;
  const matchupTitle =
    card.teamLabel && card.entityName ? `${team} + ${card.entityName}` : official;

  return {
    percentile,
    percentileLabel: `${ordinalPercentile(percentile)} Percentile Signal`,
    matchupTitle,
    statBreakdown: `${formatPpdValue(card)} | ${sampleGames} Game Sample | ${confidence}% Confidence`,
    href: card.entityHref ?? card.links[0]?.href ?? "/",
    leagueLabel: card.shortLabel,
    headline: card.headline,
  };
}
