import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import type { ProjectionEvidencePayload } from "@/lib/analytics/evidence";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  selectGameSlatePreviewCardInsights,
} from "@/lib/game-slate-preview";
import { filterHomepageInsightCards, isStatisticallySignificantInsight } from "@/lib/homepage-insight-gates";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { buildLiveHighlightTickerItems } from "@/lib/live-highlights-ticker";
import { formatSigned } from "@/lib/stats-utils";

export type TodaysBiggestEdgeView = {
  matchup: string;
  leagueLabel: string;
  projectedFouls: number;
  marketExpectation: number;
  projectedDelta: number;
  confidencePct: number;
  evidenceBullets: string[];
  preview: GameSlatePreviewPayload;
  evidence: ProjectionEvidencePayload;
};

export type DatasetMoatMetric = {
  id: string;
  value: string;
  label: string;
};

function estimateCrewCombinations(totalRefs: number): number {
  const modeled = Math.max(totalRefs, 1);
  return Math.round((modeled * (modeled - 1) * (modeled - 2)) / 6);
}

function formatCompactCount(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    if (thousands >= 100) return `${Math.round(thousands)}k`;
    return `${thousands.toFixed(1)}k`;
  }
  return value.toLocaleString("en-US");
}

export function buildDatasetMoatMetrics(data: CrossLeagueOverview): DatasetMoatMetric[] {
  return [
    {
      id: "games",
      value: formatCompactCount(data.totalGames),
      label: "Games Indexed (7 Leagues)",
    },
    {
      id: "decisions",
      value: `${formatCompactCount(data.whistleEventsLogged)}+`,
      label: "Historical Decisions",
    },
    {
      id: "officials",
      value: data.totalRefs.toLocaleString("en-US"),
      label: "Active Officials",
    },
    {
      id: "crews",
      value: formatCompactCount(estimateCrewCombinations(data.totalRefs)),
      label: "Crew Combos Modeled",
    },
  ];
}

function edgeCandidateScore(game: OverviewSlateEntry): number {
  if (!game.preview || game.preview.insufficientSample) return 0;
  const evidence = buildProjectionEvidence(game.preview);
  const deltaMagnitude = Math.abs(game.preview.foulsDelta);
  if (deltaMagnitude < 0.4) return 0;
  return deltaMagnitude * evidence.confidencePct * evidence.evidenceStrength;
}

function observationalBullet(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const withoutBullet = trimmed.replace(/^[•\-]\s*/, "");
  return withoutBullet.endsWith(".") ? withoutBullet : `${withoutBullet}.`;
}

function buildEdgeEvidenceBullets(
  preview: GameSlatePreviewPayload,
  evidence: ProjectionEvidencePayload,
): string[] {
  const cardInsights = selectGameSlatePreviewCardInsights(preview, 3).map(observationalBullet);
  if (cardInsights.length >= 3) return cardInsights.slice(0, 3);

  const driverBullets = [...evidence.factorsIncreasing, ...evidence.factorsReducing]
    .slice(0, 3)
    .map((driver) => observationalBullet(driver.headline));

  const merged = [...cardInsights];
  for (const bullet of driverBullets) {
    if (merged.length >= 3) break;
    if (!merged.includes(bullet)) merged.push(bullet);
  }

  if (merged.length === 0) {
    return [
      `Crew averages ${formatSigned(preview.foulsDelta)} ${preview.whistleLabel.toLowerCase()} vs league baseline.`,
      `${preview.sampleGames} games in the current crew sample.`,
      "Ref Watch matches historical officiating profiles for this pairing.",
    ];
  }

  while (merged.length < 3) {
    merged.push("Sample-gated crew context updates as assignments publish.");
  }

  return merged.slice(0, 3);
}

/** Pick the strongest projected edge from the live homepage slate. */
export function buildTodaysBiggestEdgeView(
  data: CrossLeagueOverview,
): TodaysBiggestEdgeView | null {
  const candidates = data.upcomingSlate.games
    .filter((game) => game.preview && game.crewCount > 0)
    .sort((left, right) => edgeCandidateScore(right) - edgeCandidateScore(left));

  const top = candidates[0];
  if (!top?.preview) return null;

  const evidence = buildProjectionEvidence(top.preview);
  const marketExpectation = top.preview.avgFouls - top.preview.foulsDelta;
  const projectedDelta = evidence.projection - marketExpectation;

  return {
    matchup: top.matchup.replace(/\s+at\s+/i, " @ "),
    leagueLabel: top.leagueLabel,
    projectedFouls: evidence.projection,
    marketExpectation: Math.round(marketExpectation * 10) / 10,
    projectedDelta: Math.round(projectedDelta * 10) / 10,
    confidencePct: evidence.confidencePct,
    evidenceBullets: buildEdgeEvidenceBullets(top.preview, evidence),
    preview: top.preview,
    evidence,
  };
}

export function buildHomepageIntelligenceTickerItems(data: CrossLeagueOverview) {
  const pool = filterHomepageInsightCards([
    ...data.topStories,
    ...data.insightCards,
    ...data.standoutSplitCards,
  ]);
  return buildLiveHighlightTickerItems(pool, 8);
}

export function buildTopStatisticalSignalCards(
  data: CrossLeagueOverview,
  limit = 6,
): LeagueInsightCard[] {
  const pool = filterHomepageInsightCards([
    ...data.standoutSplitCards,
    ...data.topStories,
    ...data.insightCards,
  ]);

  const significant = pool.filter(isStatisticallySignificantInsight);
  const source = significant.length > 0 ? significant : pool;

  const seen = new Set<string>();
  const cards: LeagueInsightCard[] = [];
  for (const card of source) {
    const key = `${card.leagueId}:${card.refSlug ?? card.headline}:${card.teamAbbr ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(card);
    if (cards.length >= limit) break;
  }
  return cards;
}
