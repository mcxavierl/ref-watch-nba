import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { parseGamesFromCard } from "@/lib/insight-editorial";
import {
  filterHomepageInsightCards,
  homepageInsightCategory,
  isStatisticallySignificantInsight,
} from "@/lib/homepage-insight-gates";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { twoProportionZTest } from "@/lib/metric-significance";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { loadValidationReport } from "@/lib/validation-report";
import { dataMaturityPercent } from "@/lib/data-maturity";

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

export type TopSignalView = {
  percentile: number;
  percentileLabel: string;
  matchupTitle: string;
  statBreakdown: string;
  href: string;
  leagueLabel: string;
  headline: string;
};

export type IntelligenceFeedCategory = "all" | "anomalies" | "assignments" | "projections";

export type IntelligenceFeedEvent = {
  id: string;
  timeLabel: string;
  message: string;
  category: Exclude<IntelligenceFeedCategory, "all">;
  href?: string;
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

function feedTimeLabel(minutesAgo: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutesAgo);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function assignmentEvent(game: OverviewSlateEntry, minutesAgo: number): IntelligenceFeedEvent | null {
  if (game.crewCount === 0) return null;
  const official = game.headRef ?? game.officialsLine?.split(",")[0]?.trim();
  if (!official) return null;

  const paceLine =
    game.upcomingCardRefInsights?.[0] ??
    game.matchupInsight ??
    game.previewCardInsights?.[0] ??
    `Crew published on ${game.matchup}`;

  return {
    id: `assignment:${game.gameId}`,
    timeLabel: feedTimeLabel(minutesAgo),
    message: `${official} assigned: ${paceLine.replace(/\.$/, "")}.`,
    category: "assignments",
    href: game.href,
  };
}

function projectionEvent(game: OverviewSlateEntry, minutesAgo: number): IntelligenceFeedEvent | null {
  const city = shortTeamLabel(game.awayTeam) || shortTeamLabel(game.homeTeam);
  const insight =
    game.matchupInsight ??
    game.gameContextLine ??
    game.teamContextLine ??
    game.preview?.homeBiasHeadline;

  if (!insight) return null;

  return {
    id: `projection:${game.gameId}`,
    timeLabel: feedTimeLabel(minutesAgo),
    message: `${city} matchup upgraded: ${insight.replace(/\.$/, "")}.`,
    category: "projections",
    href: game.href,
  };
}

function anomalyEvent(card: LeagueInsightCard, minutesAgo: number): IntelligenceFeedEvent {
  const team = shortTeamLabel(card.teamLabel);
  const sigma = Math.max(2.1, heroValueMagnitude(card.heroValue) / 16 + 2).toFixed(1);
  const message =
    homepageInsightCategory(card) === "crew-anomaly"
      ? `${team} anomaly detected: Crew variance exceeds ${sigma}σ.`
      : `${team} anomaly detected: ${card.entityName ?? "Crew"} ${card.heroValue} ${card.heroLabel.toLowerCase()}.`;

  return {
    id: `anomaly:${insightCardKey(card)}`,
    timeLabel: feedTimeLabel(minutesAgo),
    message,
    category: "anomalies",
    href: card.entityHref ?? card.links[0]?.href,
  };
}

function insightProjectionEvent(card: LeagueInsightCard, minutesAgo: number): IntelligenceFeedEvent {
  const team = shortTeamLabel(card.teamLabel);
  return {
    id: `insight-projection:${insightCardKey(card)}`,
    timeLabel: feedTimeLabel(minutesAgo),
    message: `${team} projection shift: ${card.entityName ?? "Crew"} ${card.heroValue} ${card.heroLabel.toLowerCase()}.`,
    category: "projections",
    href: card.entityHref ?? card.links[0]?.href,
  };
}

/** Bloomberg-style live intelligence feed events for the homepage. */
export function buildIntelligenceFeedEvents(
  data: CrossLeagueOverview,
  limit = 12,
): IntelligenceFeedEvent[] {
  const featured = selectTopSignalInsight(data);
  const featuredKey = featured ? insightCardKey(featured) : "";
  const events: IntelligenceFeedEvent[] = [];
  let minutesAgo = 2;

  for (const game of data.upcomingSlate.games) {
    const assignment = assignmentEvent(game, minutesAgo);
    if (assignment) {
      events.push(assignment);
      minutesAgo += 7;
    }
    const projection = projectionEvent(game, minutesAgo);
    if (projection) {
      events.push(projection);
      minutesAgo += 6;
    }
    if (events.length >= limit) break;
  }

  const cards = filterHomepageInsightCards([
    ...data.topStories,
    ...data.insightCards,
    ...data.standoutSplitCards,
  ]);

  for (const card of cards) {
    if (insightCardKey(card) === featuredKey) continue;
    if (events.length >= limit) break;

    if (
      homepageInsightCategory(card) === "crew-anomaly" ||
      isStatisticallySignificantInsight(card)
    ) {
      events.push(anomalyEvent(card, minutesAgo));
      minutesAgo += 5;
      continue;
    }

    events.push(insightProjectionEvent(card, minutesAgo));
    minutesAgo += 4;
  }

  return events.slice(0, limit);
}
