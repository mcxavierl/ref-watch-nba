import {
  formatRefStatsRange as formatNbaRange,
  getRefStats as getNbaStats,
} from "@/lib/data";
import {
  formatRefStatsRange as formatNhlRange,
  getRefStats as getNhlStats,
} from "@/lib/nhl/data";
import {
  formatRefStatsRange as formatNflRange,
  getRefStats as getNflStats,
} from "@/lib/nfl/data";
import {
  formatRefStatsRange as formatEplRange,
  getRefStats as getEplStats,
} from "@/lib/epl/data";
import {
  formatRefStatsRange as formatCbbRange,
  getRefStats as getCbbStats,
} from "@/lib/cbb/data";
import {
  formatRefStatsRange as formatCfbRange,
  getRefStats as getCfbStats,
} from "@/lib/cfb/data";
import type { LeagueId } from "@/lib/leagues";
import { buildScopedRefStats } from "@/lib/scoped-ref-stats";
import {
  filterVerifiedSeasons,
  resolveLeagueVerification,
} from "@/lib/league-verification";
import { shouldShowUnverifiedData } from "@/lib/show-unverified";
import {
  formatSeasonScope,
  resolveScopedSeasonsForLeague,
  scopedSinceSeason,
  type SeasonScopeMode,
} from "@/lib/season-scope";
import type { RefStatsFile } from "@/lib/types";

/** Seasons that appear in ref profiles (honest pool when meta lists aspirational seasons). */
function seasonsWithGameData(stats: RefStatsFile): string[] {
  const covered = new Set<string>();
  for (const ref of stats.refs) {
    for (const season of ref.seasons) covered.add(season);
  }
  const pool = [...stats.meta.seasons].sort();
  const filtered = pool.filter((season) => covered.has(season));
  return filtered.length > 0 ? filtered : pool;
}

/** Leagues that hide stats until verified ingest ships (empty when unverified). */
const INGEST_GATED_LEAGUES = new Set<LeagueId>([]);

type LeagueStatsBundle = {
  stats: RefStatsFile;
  formatRange: (meta: RefStatsFile["meta"]) => string;
};

const LOADERS: Record<LeagueId, () => LeagueStatsBundle> = {
  nba: () => ({ stats: getNbaStats(), formatRange: formatNbaRange }),
  nhl: () => ({ stats: getNhlStats(), formatRange: formatNhlRange }),
  nfl: () => ({ stats: getNflStats(), formatRange: formatNflRange }),
  epl: () => ({ stats: getEplStats(), formatRange: formatEplRange }),
  cbb: () => ({ stats: getCbbStats(), formatRange: formatCbbRange }),
  cfb: () => ({ stats: getCfbStats(), formatRange: formatCfbRange }),
  wnba: () => ({ stats: getNbaStats(), formatRange: formatNbaRange }),
  mlb: () => ({ stats: getNbaStats(), formatRange: formatNbaRange }),
};

export function loadLeagueStats(leagueId: LeagueId): LeagueStatsBundle {
  return LOADERS[leagueId]();
}

export type ScopedLeagueStatsBundle = LeagueStatsBundle & {
  scopeMode: SeasonScopeMode;
  scopedSeasons: string[];
  availableSeasons: string[];
  sinceSeason: string;
  scopeLabel: string;
};

export function loadScopedLeagueStats(
  leagueId: LeagueId,
  scopeMode: SeasonScopeMode,
): ScopedLeagueStatsBundle {
  const { stats: full, formatRange } = loadLeagueStats(leagueId);
  const verification = resolveLeagueVerification(leagueId, full.meta);
  const preview = shouldShowUnverifiedData();
  const availableSeasons = INGEST_GATED_LEAGUES.has(leagueId)
    ? filterVerifiedSeasons(leagueId, full.meta, seasonsWithGameData(full), preview)
    : seasonsWithGameData(full);
  const scopedSeasons = resolveScopedSeasonsForLeague(
    leagueId,
    scopeMode,
    availableSeasons,
  );
  const canRender =
    !INGEST_GATED_LEAGUES.has(leagueId) ||
    verification.data_verified ||
    preview;
  const stats = canRender
    ? buildScopedRefStats(leagueId, full, scopedSeasons)
    : { ...full, refs: [], teamSplits: {} };
  return {
    stats,
    formatRange,
    scopeMode,
    scopedSeasons,
    availableSeasons,
    sinceSeason: scopedSinceSeason(scopedSeasons),
    scopeLabel: formatSeasonScope(scopedSeasons.length),
  };
}

export function loadScopedStatsForDataLeague(
  leagueId: LeagueId,
  scopeMode: SeasonScopeMode,
): RefStatsFile {
  return loadScopedLeagueStats(leagueId, scopeMode).stats;
}
