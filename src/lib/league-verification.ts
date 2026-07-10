import type { LeagueId } from "@/lib/leagues";
import type { RefStatsFile } from "@/lib/types";
import { isCbbSimulatedData, isCbbVerifiedData } from "@/lib/cbb/data-source";
import { isCfbSimulatedData, isCfbVerifiedData } from "@/lib/cfb/data-source";
import { isEplSimulatedData, isEplVerifiedData } from "@/lib/epl/data-source";
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

/** Production leagues with verified real-source ingest — never show synthetic UI. */
export const VERIFIED_LIVE_LEAGUE_IDS = ["nba", "nhl", "nfl", "epl"] as const satisfies readonly LeagueId[];

export function isVerifiedLiveLeague(leagueId: LeagueId): boolean {
  return (VERIFIED_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

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
  const verified = meta.data_verified === true && meta.source === "nhl-api";
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
      (verified ? "ESPN + nflverse" : "synthetic"),
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

function inferCollegeVerification(
  meta: RefStatsFile["meta"],
  league: "cbb" | "cfb",
): LeagueVerification {
  const isVerified =
    league === "cbb"
      ? isCbbVerifiedData(meta.source)
      : isCfbVerifiedData(meta.source);
  const isSim =
    league === "cbb"
      ? isCbbSimulatedData(meta.source)
      : isCfbSimulatedData(meta.source);
  const verified = meta.data_verified === true || (isVerified && !isSim);
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
    case "cbb":
      return inferCollegeVerification(meta, "cbb");
    case "cfb":
      return inferCollegeVerification(meta, "cfb");
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
  if (leagueId === "nhl" || leagueId === "nfl") {
    const ticket = ingestTicketUrl(leagueId);
    return ticket
      ? `Data ingest in progress. Verified ${leagueId.toUpperCase()} data ships in ${ticket}.`
      : `Data ingest in progress. Verified ${leagueId.toUpperCase()} data ships soon.`;
  }
  return "Synthetic data — not from official sources";
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
