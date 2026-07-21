import { buildRefIntelligenceProfile } from "@/lib/ref-intelligence-profile";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { DataLeague } from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

const DATA_LEAGUE: Partial<Record<LeagueId, DataLeague>> = {
  nba: "NBA",
  wnba: "WNBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
};

/** Shared intelligence profile bundle for league ref profile pages. */
export function resolveRefIntelligenceProfile({
  leagueId,
  profile,
  stats,
  qualified,
}: {
  leagueId: LeagueId;
  profile: RefProfile;
  stats: RefStatsFile;
  qualified: boolean;
}) {
  const dataLeague = DATA_LEAGUE[leagueId];
  const gameLogs = dataLeague ? loadRuntimeGameLogs(dataLeague)?.games ?? null : null;

  return buildRefIntelligenceProfile({
    leagueId,
    profile,
    stats,
    qualified,
    gameLogs,
  });
}
