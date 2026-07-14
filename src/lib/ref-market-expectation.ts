import { loadRuntimeGameLogs, type DataLeague } from "@/lib/game-logs";
import { enrichRefStatsForMatrixAts } from "@/lib/matrix-ats-enrich";
import type { LeagueId } from "@/lib/leagues";
import {
  atsCoverRateFromRecord,
  hasClosingSpreadLine,
  isTeamMarketUnderdog,
  phiUnderdogCoverCorrelation,
  teamAtsResult,
} from "@/lib/team-ats";
import { getWorkerIsolateStore } from "@/lib/worker-isolate-store";
import type {
  RefMarketExpectationStats,
  RefProfile,
  RefStatsFile,
  RefTeamStat,
} from "@/lib/types";

const LEAGUE_ID_TO_DATA: Record<LeagueId, DataLeague> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
  wnba: "NBA",
  mlb: "NBA",
};

/** Minimum lined ref games before ATS deviation is surfaced. */
export const MIN_MARKET_EXPECTATION_GAMES = 12;

/** Absolute cover-rate deviation from 50% to flag an ATS outlier. */
export const ATS_OUTLIER_DEVIATION_THRESHOLD = 0.05;

type AtsCounter = { wins: number; losses: number; pushes: number };

type UnderdogCounter = AtsCounter & { games: number };

type RefExpectationAccumulator = {
  overall: AtsCounter;
  underdog: UnderdogCounter;
  correlationSamples: { underdog: boolean; covered: boolean }[];
};

type TeamExpectationAccumulator = {
  overall: AtsCounter;
  underdog: UnderdogCounter;
};

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

function emptyCounter(): AtsCounter {
  return { wins: 0, losses: 0, pushes: 0 };
}

function emptyUnderdogCounter(): UnderdogCounter {
  return { wins: 0, losses: 0, pushes: 0, games: 0 };
}

function addAts(counter: AtsCounter, result: "win" | "loss" | "push"): void {
  if (result === "win") counter.wins += 1;
  else if (result === "loss") counter.losses += 1;
  else counter.pushes += 1;
}

function counterGames(counter: AtsCounter): number {
  return counter.wins + counter.losses + counter.pushes;
}

function deviationFromNeutral(coverRate: number): number {
  return Math.round((coverRate - 0.5) * 1000) / 1000;
}

function enrichCacheKey(
  leagueId: LeagueId,
  stats: RefStatsFile,
  scopedSeasons: string[],
): string {
  return [
    "market-expectation:v1",
    leagueId,
    stats.meta.lastUpdated,
    [...scopedSeasons].sort().join(","),
    stats.refs.length,
  ].join("|");
}

function teamStatFromAccumulator(
  acc: TeamExpectationAccumulator,
): Pick<
  RefTeamStat,
  | "atsWins"
  | "atsLosses"
  | "atsPushes"
  | "atsGames"
  | "atsCoverRate"
  | "underdogAtsCoverRate"
  | "underdogAtsGames"
  | "atsDeviationFromNeutral"
> {
  const atsGames = counterGames(acc.overall);
  const coverRate = atsCoverRateFromRecord(
    acc.overall.wins,
    acc.overall.losses,
    acc.overall.pushes,
  );
  const underdogGames = counterGames(acc.underdog);
  const underdogCoverRate = atsCoverRateFromRecord(
    acc.underdog.wins,
    acc.underdog.losses,
    acc.underdog.pushes,
  );
  return {
    atsWins: acc.overall.wins,
    atsLosses: acc.overall.losses,
    atsPushes: acc.overall.pushes,
    atsGames,
    atsCoverRate: coverRate,
    underdogAtsGames: underdogGames,
    underdogAtsCoverRate: underdogGames > 0 ? underdogCoverRate : undefined,
    atsDeviationFromNeutral: atsGames > 0 ? deviationFromNeutral(coverRate) : undefined,
  };
}

function marketExpectationFromAccumulator(
  acc: RefExpectationAccumulator,
  linesAvailable: boolean,
): RefMarketExpectationStats {
  const linedGames = counterGames(acc.overall);
  const coverRate = atsCoverRateFromRecord(
    acc.overall.wins,
    acc.overall.losses,
    acc.overall.pushes,
  );
  const deviation = deviationFromNeutral(coverRate);
  const underdogGames = counterGames(acc.underdog);
  const underdogCoverRate = atsCoverRateFromRecord(
    acc.underdog.wins,
    acc.underdog.losses,
    acc.underdog.pushes,
  );
  const underdogDeviation = deviationFromNeutral(underdogCoverRate);
  const absDeviation = Math.abs(deviation);
  const isAtsOutlier =
    linesAvailable &&
    linedGames >= MIN_MARKET_EXPECTATION_GAMES &&
    absDeviation >= ATS_OUTLIER_DEVIATION_THRESHOLD;

  return {
    linedGames,
    atsCovers: acc.overall.wins,
    atsLosses: acc.overall.losses,
    atsPushes: acc.overall.pushes,
    coverRate,
    deviationFromNeutral: deviation,
    underdogGames,
    underdogCoverRate: underdogGames > 0 ? underdogCoverRate : 0,
    underdogDeviationFromNeutral:
      underdogGames > 0 ? underdogDeviation : 0,
    isAtsOutlier,
    outlierDirection: isAtsOutlier
      ? deviation > 0
        ? "covers_more"
        : "covers_less"
      : null,
    underdogCoverCorrelation: phiUnderdogCoverCorrelation(
      acc.correlationSamples,
    ),
    linesAvailable,
  };
}

/** Scan refs with extreme ATS deviation independent of straight-up W-L. */
export function scanAtsOutlierRefs(stats: RefStatsFile): RefProfile[] {
  return stats.refs.filter(
    (ref) => ref.marketExpectation?.isAtsOutlier === true,
  );
}

/** Strongest market-expectation ATS outlier by absolute deviation. */
export function pickStrongestMarketAtsOutlier(
  stats: RefStatsFile,
): { ref: RefProfile; market: RefMarketExpectationStats } | null {
  let best:
    | { ref: RefProfile; market: RefMarketExpectationStats; edge: number }
    | undefined;

  for (const ref of stats.refs) {
    const market = ref.marketExpectation;
    if (!market?.linesAvailable || !market.isAtsOutlier) continue;
    const edge = Math.abs(market.deviationFromNeutral);
    if (!best || edge > best.edge) {
      best = { ref, market, edge };
    }
  }

  return best ? { ref: best.ref, market: best.market } : null;
}

/**
 * Enrich ref stats with performance vs closing-line expectation (ATS-first),
 * underdog-normalized ref×team splits, and ATS outlier flags.
 */
export function enrichRefStatsForMarketExpectation(
  leagueId: LeagueId,
  stats: RefStatsFile,
  scopedSeasons: string[],
): RefStatsFile {
  if (!stats.meta.atsAvailable) return stats;

  const cacheKey = enrichCacheKey(leagueId, stats, scopedSeasons);
  const cached = getWorkerIsolateStore().marketExpectationEnrich.get(cacheKey);
  if (cached) return cached;

  const logs = loadRuntimeGameLogs(LEAGUE_ID_TO_DATA[leagueId]);
  if (!logs?.games?.length) return stats;

  const seasonSet = new Set(scopedSeasons);
  const games = logs.games.filter((game) => seasonSet.has(game.season));
  if (games.length === 0) return stats;

  const refTeamAcc = new Map<string, Map<string, TeamExpectationAccumulator>>();
  const refAcc = new Map<string, RefExpectationAccumulator>();
  let linedGameCount = 0;

  for (const game of games) {
    const hasLine = hasClosingSpreadLine(game);
    if (!hasLine) continue;
    linedGameCount += 1;

    const homeAts = teamAtsResult(
      true,
      game.homeScore,
      game.awayScore,
      game.homeSpread,
      hasLine,
    );
    const homeUnderdog = isTeamMarketUnderdog(true, game.homeSpread);

    for (const [teamAbbr, isHome] of [
      [game.homeTeam, true],
      [game.awayTeam, false],
    ] as const) {
      const ats = teamAtsResult(
        isHome,
        game.homeScore,
        game.awayScore,
        game.homeSpread,
        hasLine,
      );
      if (!ats) continue;

      const underdog = isTeamMarketUnderdog(isHome, game.homeSpread);

      for (const official of game.officials) {
        const slug = refSlug(official.name, official.number);

        const byTeam = refTeamAcc.get(slug) ?? new Map();
        const teamBucket =
          byTeam.get(teamAbbr) ??
          ({
            overall: emptyCounter(),
            underdog: emptyUnderdogCounter(),
          } satisfies TeamExpectationAccumulator);
        addAts(teamBucket.overall, ats);
        if (underdog) {
          addAts(teamBucket.underdog, ats);
        }
        byTeam.set(teamAbbr, teamBucket);
        refTeamAcc.set(slug, byTeam);
      }
    }

    if (!homeAts) continue;

    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      const refBucket =
        refAcc.get(slug) ??
        ({
          overall: emptyCounter(),
          underdog: emptyUnderdogCounter(),
          correlationSamples: [],
        } satisfies RefExpectationAccumulator);
      addAts(refBucket.overall, homeAts);
      if (homeUnderdog) {
        addAts(refBucket.underdog, homeAts);
      }
      if (homeAts !== "push") {
        refBucket.correlationSamples.push({
          underdog: homeUnderdog,
          covered: homeAts === "win",
        });
      }
      refAcc.set(slug, refBucket);
    }
  }

  const linesAvailable = linedGameCount > 0;

  const refs: RefProfile[] = stats.refs.map((ref) => {
    const byTeam = refTeamAcc.get(ref.slug);
    const acc = refAcc.get(ref.slug);

    let teamStats = ref.teamStats;
    if (byTeam && ref.teamStats) {
      teamStats = Object.fromEntries(
        Object.entries(ref.teamStats).map(([teamAbbr, stat]) => {
          const bucket = byTeam.get(teamAbbr);
          if (!bucket) return [teamAbbr, stat];
          return [teamAbbr, { ...stat, ...teamStatFromAccumulator(bucket) }];
        }),
      );
    }

    const marketExpectation = acc
      ? marketExpectationFromAccumulator(acc, linesAvailable)
      : undefined;

    return {
      ...ref,
      teamStats,
      marketExpectation,
    };
  });

  const enriched: RefStatsFile = {
    ...stats,
    refs,
  };

  getWorkerIsolateStore().marketExpectationEnrich.set(cacheKey, enriched);

  refTeamAcc.clear();
  refAcc.clear();

  return enriched;
}

export function prepareRefStatsForMarketAnalytics(
  leagueId: LeagueId,
  stats: RefStatsFile,
  scopedSeasons: string[],
): RefStatsFile {
  return enrichRefStatsForMarketExpectation(leagueId, stats, scopedSeasons);
}

/** Matrix + findings path: ATS splits then market-expectation enrichment. */
export function prepareStatsForAtsAnalytics(
  leagueId: LeagueId,
  stats: RefStatsFile,
  scopedSeasons?: string[],
): RefStatsFile {
  if (!scopedSeasons?.length || !stats.meta.atsAvailable) return stats;
  const withAts = enrichRefStatsForMatrixAts(leagueId, stats, scopedSeasons);
  return enrichRefStatsForMarketExpectation(leagueId, withAts, scopedSeasons);
}
