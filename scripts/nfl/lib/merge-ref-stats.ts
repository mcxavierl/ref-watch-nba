import type { RefProfile, RefStatsFile, RefTeamStat } from "../../../src/lib/types";

function mergeTeamStats(
  base: Record<string, RefTeamStat> | undefined,
  overlay: Record<string, RefTeamStat> | undefined,
  preferOverlay = true,
): Record<string, RefTeamStat> {
  if (preferOverlay && overlay && Object.keys(overlay).length > 0) {
    return { ...overlay };
  }

  const merged: Record<string, RefTeamStat> = { ...(base ?? {}) };
  for (const [team, overlayStat] of Object.entries(overlay ?? {})) {
    const baseStat = merged[team];
    if (!baseStat || overlayStat.games >= baseStat.games) {
      merged[team] = overlayStat;
    }
  }
  return merged;
}

function mergeRefProfile(base: RefProfile, overlay: RefProfile): RefProfile {
  const useOverlayCounts = overlay.games > 0;
  return {
    ...base,
    games: Math.max(base.games, overlay.games),
    avgTotalPoints: useOverlayCounts ? overlay.avgTotalPoints : base.avgTotalPoints,
    overRate: useOverlayCounts ? overlay.overRate : base.overRate,
    avgFouls: useOverlayCounts ? overlay.avgFouls : base.avgFouls,
    totalPointsDelta: useOverlayCounts
      ? overlay.totalPointsDelta
      : base.totalPointsDelta,
    foulsDelta: useOverlayCounts ? overlay.foulsDelta : base.foulsDelta,
    seasons: [...new Set([...(base.seasons ?? []), ...(overlay.seasons ?? [])])].sort(),
    recentGames:
      overlay.recentGames.length > 0 ? overlay.recentGames : base.recentGames,
    teamStats: mergeTeamStats(base.teamStats, overlay.teamStats),
    nflAnalytics: overlay.nflAnalytics ?? base.nflAnalytics,
    bettingStats: overlay.bettingStats?.linesAvailable
      ? overlay.bettingStats
      : base.bettingStats ?? overlay.bettingStats,
    homeCoverRate: overlay.bettingStats?.linesAvailable
      ? overlay.homeCoverRate
      : overlay.homeCoverRate ?? base.homeCoverRate,
  };
}

/** Merge ESPN (or live) build into seed baseline without losing matrix depth. */
export function mergeNflRefStats(
  base: RefStatsFile,
  overlay: RefStatsFile,
): RefStatsFile {
  const overlayBySlug = new Map(overlay.refs.map((ref) => [ref.slug, ref]));
  const mergedRefs: RefProfile[] = base.refs.map((ref) => {
    const live = overlayBySlug.get(ref.slug);
    if (!live) return ref;
    overlayBySlug.delete(ref.slug);
    return mergeRefProfile(ref, live);
  });

  for (const ref of overlayBySlug.values()) {
    mergedRefs.push(ref);
  }
  mergedRefs.sort((a, b) => b.games - a.games);

  const seasons = [
    ...new Set([
      ...base.meta.seasons,
      ...overlay.meta.seasons,
      ...mergedRefs.flatMap((r) => r.seasons ?? []),
    ]),
  ].sort();

  const teamStatsPairs = mergedRefs.reduce(
    (sum, ref) => sum + Object.keys(ref.teamStats ?? {}).length,
    0,
  );
  const qualifiedPairs = mergedRefs.reduce((sum, ref) => {
    return (
      sum +
      Object.values(ref.teamStats ?? {}).filter((stat) => stat.games >= 3).length
    );
  }, 0);

  return {
    meta: {
      ...base.meta,
      lastUpdated: new Date().toISOString(),
      seasons,
      leagueAvgTotal: overlay.meta.leagueAvgTotal || base.meta.leagueAvgTotal,
      leagueAvgFouls: overlay.meta.leagueAvgFouls || base.meta.leagueAvgFouls,
      leagueAvgPenaltyYards:
        overlay.meta.leagueAvgPenaltyYards ?? base.meta.leagueAvgPenaltyYards,
      refCount: mergedRefs.length,
      totalGamesProcessed: Math.max(
        base.meta.totalGamesProcessed ?? 0,
        overlay.meta.totalGamesProcessed ?? 0,
      ),
      dateRange: overlay.meta.dateRange ?? base.meta.dateRange,
      source: "hybrid",
      data_verified: true,
      data_source: "ESPN + nflverse",
      atsAvailable: base.meta.atsAvailable || overlay.meta.atsAvailable,
      note:
        `Hybrid dataset: ${overlay.meta.totalGamesProcessed ?? 0} ESPN-verified games; ` +
        `ref×team W-L rebuilt from game logs. ` +
        `${qualifiedPairs}/${teamStatsPairs} ref×team pairs meet 3+ game matrix gate.`,
    },
    refs: mergedRefs,
    teamSplits:
      Object.keys(overlay.teamSplits ?? {}).length > 0
        ? overlay.teamSplits
        : base.teamSplits,
  };
}
