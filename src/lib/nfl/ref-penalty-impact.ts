import { loadRuntimeGameLogs } from "@/lib/game-logs";
import {
  aggregateGameLeverageImpact,
  estimateGameLeverageFromFlagTotals,
  LEAGUE_AVG_HIGH_LEVERAGE_IMPACT,
} from "@/lib/impact-calculator";
import { getWorkerIsolateStore } from "@/lib/worker-isolate-store";
import type { NflPenaltyEvent, NflRefAnalytics, RefProfile } from "@/lib/types";

export type { WhistleMetricView } from "@/lib/nfl/ref-penalty-impact-display";
export { resolveWhistleMetricDisplay } from "@/lib/nfl/ref-penalty-impact-display";

export type RefLeverageImpactSummary = {
  avgHighLeverageImpactPerGame: number;
  highLeverageImpactDelta: number;
  highLeverageFlagRate: number | null;
  leverageSampleGames: number;
  eventBackedGames: number;
};

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

function cacheKey(slug: string, seasons: string[]): string {
  return ["nfl-leverage", slug, [...seasons].sort().join(",")].join("|");
}

/** Request-scoped leverage impact from game logs with optional penalty events. */
export function computeRefLeverageImpact(
  profile: RefProfile,
  scopedSeasons: string[],
): RefLeverageImpactSummary | null {
  const cacheKeyValue = cacheKey(profile.slug, scopedSeasons);
  const cached = getWorkerIsolateStore().matrixCompute.get(cacheKeyValue);
  if (cached) return cached as RefLeverageImpactSummary;

  const logs = loadRuntimeGameLogs("NFL");
  if (!logs?.games?.length) return null;

  const seasonSet = new Set(scopedSeasons);
  let impactTotal = 0;
  let games = 0;
  let rateTotal = 0;
  let eventBacked = 0;

  for (const game of logs.games) {
    if (!seasonSet.has(game.season)) continue;
    const officiates = game.officials.some(
      (official) => refSlug(official.name, official.number) === profile.slug,
    );
    if (!officiates) continue;

    games += 1;
    if (game.penaltyEvents?.length) {
      const summary = aggregateGameLeverageImpact(game.penaltyEvents);
      impactTotal += summary.highLeverageScore;
      if (summary.flagCount > 0) {
        rateTotal += summary.highLeverageFlagCount / summary.flagCount;
        eventBacked += 1;
      }
      continue;
    }

    if (game.highLeverageImpact !== undefined) {
      impactTotal += game.highLeverageImpact;
      if (game.highLeverageFlagRate !== undefined) {
        rateTotal += game.highLeverageFlagRate;
        eventBacked += 1;
      }
      continue;
    }

    impactTotal += estimateGameLeverageFromFlagTotals(
      game.homeFlags,
      game.awayFlags,
    );
  }

  if (games < 10) return null;

  const avgHighLeverageImpactPerGame = impactTotal / games;
  const summary: RefLeverageImpactSummary = {
    avgHighLeverageImpactPerGame:
      Math.round(avgHighLeverageImpactPerGame * 10) / 10,
    highLeverageImpactDelta:
      Math.round(
        (avgHighLeverageImpactPerGame - LEAGUE_AVG_HIGH_LEVERAGE_IMPACT) * 10,
      ) / 10,
    highLeverageFlagRate:
      eventBacked > 0
        ? Math.round((rateTotal / eventBacked) * 1000) / 1000
        : null,
    leverageSampleGames: games,
    eventBackedGames: eventBacked,
  };

  getWorkerIsolateStore().matrixCompute.set(cacheKeyValue, summary);
  return summary;
}

export function topLeveragePenaltyTypes(
  events: NflPenaltyEvent[],
  limit = 3,
): string[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (!event.accepted) continue;
    counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([type]) => type.replace(/_/g, " "));
}
