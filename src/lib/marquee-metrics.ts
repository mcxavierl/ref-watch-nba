import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { DataLeague, RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import { classifyMarqueeGame, isMarqueeGame } from "@/lib/marquee-games";
import type { LeagueId } from "@/lib/leagues";
import {
  MARQUEE_CI_MIN_GAMES,
  MIN_MARQUEE_COMPARISON_GAMES,
} from "@/lib/marquee-metrics.constants";
import type { RefMarqueePerformance } from "@/lib/marquee-metrics.shared";
import { passesMarqueeComparisonGate } from "@/lib/marquee-metrics.shared";
import { PRO_MATRIX_ANALYTICS_LEAGUE_IDS } from "@/lib/league-verification";
import {
  formatWilsonPct,
  wilsonScoreInterval,
} from "@/lib/stats-query/wilson-ci";
import {
  atsCoverRateFromRecord,
  hasClosingSpreadLine,
  teamAtsResult,
} from "@/lib/team-ats";
import type { RefProfile } from "@/lib/types";
import {
  getWorkerIsolateStore,
  releaseParsedPayload,
} from "@/lib/worker-isolate-store";

export {
  MARQUEE_CI_MIN_GAMES,
  MIN_MARQUEE_COMPARISON_GAMES,
  passesMarqueeComparisonGate,
  type RefMarqueePerformance,
} from "@/lib/marquee-metrics.shared";

const LEAGUE_TO_DATA: Record<(typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number], DataLeague> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
};

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

function officiatedBy(
  game: RuntimeGameLogEntry,
  slug: string,
): boolean {
  return game.officials.some(
    (official) => refSlug(official.name, official.number) === slug,
  );
}

interface BucketAccumulator {
  games: number;
  overHits: number;
  foulSum: number;
  atsWins: number;
  atsLosses: number;
  atsPushes: number;
}

function emptyBucket(): BucketAccumulator {
  return {
    games: 0,
    overHits: 0,
    foulSum: 0,
    atsWins: 0,
    atsLosses: 0,
    atsPushes: 0,
  };
}

function addGameToBucket(
  bucket: BucketAccumulator,
  game: RuntimeGameLogEntry,
): void {
  bucket.games += 1;
  if (game.totalPoints > game.closingTotal) bucket.overHits += 1;
  bucket.foulSum += game.totalFouls;

  if (!hasClosingSpreadLine(game)) return;
  const homeAts = teamAtsResult(
    true,
    game.homeScore,
    game.awayScore,
    game.homeSpread,
    true,
  );
  if (homeAts === "win") bucket.atsWins += 1;
  else if (homeAts === "loss") bucket.atsLosses += 1;
  else if (homeAts === "push") bucket.atsPushes += 1;
}

function finalizeBucket(bucket: BucketAccumulator): {
  overRate: number;
  avgFouls: number;
  atsCoverRate: number | null;
} {
  if (bucket.games === 0) {
    return { overRate: 0, avgFouls: 0, atsCoverRate: null };
  }
  const atsDecisions = bucket.atsWins + bucket.atsLosses + bucket.atsPushes;
  return {
    overRate: bucket.overHits / bucket.games,
    avgFouls: bucket.foulSum / bucket.games,
    atsCoverRate:
      atsDecisions > 0
        ? atsCoverRateFromRecord(
            bucket.atsWins,
            bucket.atsLosses,
            bucket.atsPushes,
          )
        : null,
  };
}

function maybeWilsonCi(
  successes: number,
  trials: number,
): { low: number; high: number; label: string } | null {
  if (trials < MARQUEE_CI_MIN_GAMES) return null;
  const ci = wilsonScoreInterval(successes, trials);
  return {
    low: ci.low,
    high: ci.high,
    label: formatWilsonPct(ci.low, ci.high),
  };
}

function marqueeCacheKey(leagueId: LeagueId, refSlugValue: string): string {
  return `marquee:${leagueId}:${refSlugValue}`;
}

/** Request-scoped sieve: aggregate marquee-only ATS, O/U, and whistle rates for one ref. */
export function computeRefMarqueePerformance(
  leagueId: LeagueId,
  profile: RefProfile,
  gameLogs?: RuntimeGameLogEntry[] | null,
): RefMarqueePerformance | null {
  if (!(PRO_MATRIX_ANALYTICS_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId)) {
    return null;
  }

  const cache = getWorkerIsolateStore().matrixCompute;
  const cacheKey = marqueeCacheKey(leagueId, profile.slug);
  const cached = cache.get(cacheKey);
  if (cached) return cached as RefMarqueePerformance;

  const dataLeague = LEAGUE_TO_DATA[leagueId as (typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number]];
  let allGames: RuntimeGameLogEntry[] | null =
    gameLogs ?? loadRuntimeGameLogs(dataLeague)?.games ?? null;

  if (!allGames?.length) {
    releaseParsedPayload(allGames);
    return null;
  }

  let officiated: RuntimeGameLogEntry[] | null = [];
  const tagSet = new Set<string>();

  try {
    for (const game of allGames) {
      if (!officiatedBy(game, profile.slug)) continue;
      officiated.push(game);
      if (isMarqueeGame(game, leagueId)) {
        const ctx = classifyMarqueeGame(game, leagueId);
        for (const reason of ctx.reasons.slice(0, 2)) {
          tagSet.add(reason);
        }
      }
    }

    if (officiated.length === 0) {
      return null;
    }

    const marqueeBucket = emptyBucket();
    const baselineBucket = emptyBucket();

    for (const game of officiated) {
      const bucket = isMarqueeGame(game, leagueId)
        ? marqueeBucket
        : baselineBucket;
      addGameToBucket(bucket, game);
    }

    const marquee = finalizeBucket(marqueeBucket);
    const baseline = finalizeBucket(baselineBucket);

    const result: RefMarqueePerformance = {
      refSlug: profile.slug,
      leagueId,
      marqueeGames: marqueeBucket.games,
      baselineGames: baselineBucket.games,
      marqueeOverRate: marquee.overRate,
      baselineOverRate: baseline.overRate,
      marqueeAtsCoverRate: marquee.atsCoverRate,
      baselineAtsCoverRate: baseline.atsCoverRate,
      marqueeAvgFouls: marquee.avgFouls,
      baselineAvgFouls: baseline.avgFouls,
      overRateCi: maybeWilsonCi(marqueeBucket.overHits, marqueeBucket.games),
      atsCoverCi:
        marqueeBucket.atsWins + marqueeBucket.atsLosses + marqueeBucket.atsPushes > 0
          ? maybeWilsonCi(
              marqueeBucket.atsWins,
              marqueeBucket.atsWins +
                marqueeBucket.atsLosses +
                marqueeBucket.atsPushes,
            )
          : null,
      sampleTags: [...tagSet].slice(0, 4),
    };

    cache.set(cacheKey, result);
    return result;
  } finally {
    officiated = releaseParsedPayload(officiated);
    allGames = releaseParsedPayload(allGames);
    releaseParsedPayload(tagSet);
  }
}

export interface MarqueeLeagueScanResult {
  refSlug: string;
  refName: string;
  deltaOverPp: number;
  deltaAtsPp: number | null;
  marqueeGames: number;
  performance: RefMarqueePerformance;
}

/** Scan all refs for the largest marquee-vs-baseline efficiency split (Research findings). */
export function scanLeagueMarqueeEfficiency(
  leagueId: LeagueId,
  refs: RefProfile[],
  gameLogs?: RuntimeGameLogEntry[] | null,
): MarqueeLeagueScanResult | null {
  let best: MarqueeLeagueScanResult | null = null;

  for (const ref of refs) {
    const performance = computeRefMarqueePerformance(leagueId, ref, gameLogs);
    if (!performance || !passesMarqueeComparisonGate(performance)) continue;

    const deltaOverPp =
      (performance.marqueeOverRate - performance.baselineOverRate) * 100;
    const deltaAtsPp =
      performance.marqueeAtsCoverRate !== null &&
      performance.baselineAtsCoverRate !== null
        ? (performance.marqueeAtsCoverRate - performance.baselineAtsCoverRate) *
          100
        : null;

    const magnitude = Math.max(
      Math.abs(deltaOverPp),
      Math.abs(deltaAtsPp ?? 0),
    );
    if (magnitude < 6) continue;

    if (!best || magnitude > Math.max(Math.abs(best.deltaOverPp), Math.abs(best.deltaAtsPp ?? 0))) {
      best = {
        refSlug: ref.slug,
        refName: ref.name,
        deltaOverPp,
        deltaAtsPp,
        marqueeGames: performance.marqueeGames,
        performance,
      };
    }
  }

  return best;
}
