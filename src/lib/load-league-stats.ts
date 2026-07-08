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
  formatSeasonScopeFromMode,
  resolveScopedSeasonsForLeague,
  scopedSinceSeason,
  type SeasonScopeMode,
} from "@/lib/season-scope";
import type { RefStatsFile } from "@/lib/types";

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
  const availableSeasons = filterVerifiedSeasons(
    leagueId,
    full.meta,
    full.meta.seasons,
    preview,
  );
  const scopedSeasons = resolveScopedSeasonsForLeague(
    leagueId,
    scopeMode,
    availableSeasons,
  );
  const stats =
    verification.data_verified || preview
      ? buildScopedRefStats(leagueId, full, scopedSeasons)
      : { ...full, refs: [], teamSplits: {} };
  return {
    stats,
    formatRange,
    scopeMode,
    scopedSeasons,
    sinceSeason: scopedSinceSeason(scopedSeasons),
    scopeLabel: formatSeasonScopeFromMode(scopeMode),
  };
}

export function loadScopedStatsForDataLeague(
  leagueId: LeagueId,
  scopeMode: SeasonScopeMode,
): RefStatsFile {
  return loadScopedLeagueStats(leagueId, scopeMode).stats;
}
