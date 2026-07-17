import type { LeagueId } from "@/lib/leagues";
import type { RefStatsFile } from "@/lib/types";
import { isCbbSimulatedData, isCbbVerifiedData } from "@/lib/cbb/data-source";
import { isCfbSimulatedData, isCfbVerifiedData } from "@/lib/cfb/data-source";
import { isEplSimulatedData, isEplVerifiedData } from "@/lib/epl/data-source";
import { isLaligaSimulatedData, isLaligaVerifiedData } from "@/lib/laliga/data-source";
import {
  isNhlSimulatedData,
  isNhlVerifiedData,
} from "@/lib/nhl/data-source";
import {
  isNflHybridData,
  isNflSimulatedData,
  isNflVerifiedData,
} from "@/lib/nfl/data-source";
import { shouldShowUnverifiedData } from "@/lib/show-unverified";

export type LeagueVerification = {
  data_verified: boolean;
  data_source: string;
  canRenderStats: boolean;
  verifiedSeasons: string[];
};

import {
  filterNcaaRefStats,
  hasNcaaLiveConferenceCoverage,
} from "@/lib/ncaa-conference-gate";
import {
  isVerifiedLiveLeague,
  PRO_VERIFIED_LIVE_LEAGUE_IDS,
  VERIFIED_LIVE_LEAGUE_IDS,
} from "@/lib/verified-live-leagues";
export {
  activeLiveLeagueIds,
  COLLEGE_LIVE_LEAGUE_IDS,
  isCollegeLiveLeague,
  isNcaaConferenceGatedLive,
  isProOnlyLiveLeague,
  isProVerifiedLiveLeague,
  isVerifiedLiveLeague,
  LAUNCHED_NCAA_LEAGUE_IDS,
  OVERVIEW_HUB_LEAGUE_IDS,
  PRIMARY_LIVE_LEAGUE_IDS,
  PRO_ONLY_LIVE_LEAGUE_IDS,
  PRO_VERIFIED_LIVE_LEAGUE_IDS,
  VERIFIED_LIVE_LEAGUE_IDS,
  OVERVIEW_INSIGHT_LEAGUE_IDS,
} from "@/lib/verified-live-leagues";

const INGEST_TICKET_URLS: Partial<Record<LeagueId, string>> = {
  nhl: "https://github.com/mcxavierl/ref-watch-nba/issues/6",
  nfl: "https://github.com/mcxavierl/ref-watch-nba/issues/7",
};

export function ingestTicketUrl(leagueId: LeagueId): string | null {
  return INGEST_TICKET_URLS[leagueId] ?? null;
}

function inferNbaVerification(meta: RefStatsFile["meta"]): LeagueVerification {
  const verified =
    meta.data_verified === true ||
    meta.source === "nba-stats-api" ||
    meta.source === "hybrid";
  const data_source =
    meta.data_source ??
    (verified ? "Basketball-Reference + NBA Stats API" : "synthetic");
  return {
    data_verified: verified,
    data_source,
    canRenderStats: verified,
    verifiedSeasons: verified ? [...meta.seasons] : [],
  };
}

function inferNhlVerification(meta: RefStatsFile["meta"]): LeagueVerification {
  const verified =
    meta.data_verified === true &&
    isNhlVerifiedData(meta.source) &&
    !isNhlSimulatedData(meta.source);
  return {
    data_verified: verified,
    data_source:
      meta.data_source ?? (verified ? "NHL API (api-web.nhle.com)" : "synthetic"),
    canRenderStats: verified,
    verifiedSeasons: verified ? [...meta.seasons] : [],
  };
}

function inferNflVerification(meta: RefStatsFile["meta"]): LeagueVerification {
  const verified =
    meta.data_verified === true &&
    (isNflVerifiedData(meta.source) || isNflHybridData(meta.source)) &&
    !isNflSimulatedData(meta.source);
  return {
    data_verified: verified,
    data_source:
      meta.data_source ??
      (verified ? "ESPN + nflverse (2000-present)" : "synthetic"),
    canRenderStats: verified,
    verifiedSeasons: verified ? [...meta.seasons] : [],
  };
}

function inferEplVerification(meta: RefStatsFile["meta"]): LeagueVerification {
  const verified =
    meta.data_verified === true &&
    isEplVerifiedData(meta.source) &&
    !isEplSimulatedData(meta.source);
  const defaultSource =
    meta.source === "football-data" ? "football-data.co.uk" : "ESPN";
  return {
    data_verified: verified,
    data_source: meta.data_source ?? (verified ? defaultSource : "synthetic"),
    canRenderStats: verified,
    verifiedSeasons: verified ? [...meta.seasons] : [],
  };
}

function inferLaligaVerification(meta: RefStatsFile["meta"]): LeagueVerification {
  const verified =
    meta.data_verified === true &&
    isLaligaVerifiedData(meta.source) &&
    !isLaligaSimulatedData(meta.source);
  return {
    data_verified: verified,
    data_source: meta.data_source ?? (verified ? "ESPN" : "synthetic"),
    canRenderStats: verified,
    verifiedSeasons: verified ? [...meta.seasons] : [],
  };
}

function inferCollegeVerification(
  meta: RefStatsFile["meta"],
  league: "cbb" | "cfb",
  stats?: RefStatsFile,
): LeagueVerification {
  const isVerified =
    league === "cbb"
      ? isCbbVerifiedData(meta.source)
      : isCfbVerifiedData(meta.source);
  const isSim =
    league === "cbb"
      ? isCbbSimulatedData(meta.source)
      : isCfbSimulatedData(meta.source);
  const sourceVerified = meta.data_verified === true || (isVerified && !isSim);
  const scopedStats = stats ? filterNcaaRefStats(stats, league) : stats;
  const conferenceGatedLive = hasNcaaLiveConferenceCoverage(league, scopedStats);
  const verified = sourceVerified && conferenceGatedLive;
  return {
    data_verified: verified,
    data_source: meta.data_source ?? (verified ? "ESPN" : "synthetic"),
    canRenderStats: verified,
    verifiedSeasons: verified ? [...meta.seasons] : [],
  };
}

export function resolveLeagueVerification(
  leagueId: LeagueId,
  meta: RefStatsFile["meta"],
  stats?: RefStatsFile,
): LeagueVerification {
  switch (leagueId) {
    case "nba":
    case "wnba":
    case "mlb":
      return inferNbaVerification(meta);
    case "nhl":
      return inferNhlVerification(meta);
    case "nfl":
      return inferNflVerification(meta);
    case "epl":
      return inferEplVerification(meta);
    case "laliga":
      return inferLaligaVerification(meta);
    case "cbb":
      return inferCollegeVerification(meta, "cbb", stats);
    case "cfb":
      return inferCollegeVerification(meta, "cfb", stats);
    default:
      return {
        data_verified: false,
        data_source: "unknown",
        canRenderStats: false,
        verifiedSeasons: [],
      };
  }
}

export function canRenderLeagueStats(
  leagueId: LeagueId,
  meta: RefStatsFile["meta"],
  preview = false,
): boolean {
  const v = resolveLeagueVerification(leagueId, meta);
  if (v.canRenderStats) return true;
  return preview || shouldShowUnverifiedData();
}

export function agentDataSourceSuffix(meta: RefStatsFile["meta"]): string {
  const verified = meta.data_verified === true;
  const source = meta.data_source ?? meta.source;
  if (verified) {
    return `source: ${source}, verified`;
  }
  return `source: ${source}, unverified`;
}

export function unverifiedBannerMessage(
  leagueId: LeagueId,
  meta: RefStatsFile["meta"],
): string {
  const v = resolveLeagueVerification(leagueId, meta);
  if (v.data_verified) return "";
  if (leagueId === "cbb") return "";
  if (leagueId === "nhl" || leagueId === "nfl") {
    const label = leagueId.toUpperCase();
    return `We're still building verified ${label} data.`;
  }
  return "Preview data: not from official sources";
}

export function filterVerifiedSeasons(
  leagueId: LeagueId,
  meta: RefStatsFile["meta"],
  seasons: string[],
  preview = false,
): string[] {
  const v = resolveLeagueVerification(leagueId, meta);
  if (v.data_verified || preview || shouldShowUnverifiedData()) {
    return seasons;
  }
  if (v.verifiedSeasons.length === 0) return [];
  const allowed = new Set(v.verifiedSeasons);
  return seasons.filter((s) => allowed.has(s));
}
