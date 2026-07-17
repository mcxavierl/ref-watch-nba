import {
  getTeamRecordFromLogs,
} from "@/lib/game-count";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import { resolveRecordSeasonsForDisplay } from "@/lib/record-seasons";
import { getOfficialTeamRegularSeasonRecord } from "@/lib/team-record-query";
import type { TeamSampleRecord } from "@/lib/teamRecord";
import { getTeamSampleRecord } from "@/lib/teamRecord";
import type { TeamCrewSplit } from "@/lib/types";

const LEAGUE_DATA_MAP = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
} as const;

export interface TeamDisplayRecordOptions {
  /** Include postseason games (NBA gameId prefix 004). Default false. */
  includePlayoffs?: boolean;
  /** Earliest season label inclusive (e.g. "2021-22"). */
  sinceSeason?: string;
}

/**
 * Team W-L for page display. NBA uses official regular-season standings when
 * available; all leagues prefer DISTINCT game_id totals from logs over crew splits.
 */
export function getTeamDisplayRecord(
  league: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb",
  teamAbbr: string,
  splits: TeamCrewSplit[],
  seasons: string[],
  options: TeamDisplayRecordOptions = {},
): TeamSampleRecord {
  if (league === "nba" && !options.includePlayoffs) {
    return getOfficialTeamRegularSeasonRecord(teamAbbr, seasons, options);
  }

  const dataLeague = LEAGUE_DATA_MAP[league];
  const recordSeasons = resolveRecordSeasonsForDisplay(
    dataLeague,
    seasons,
    options.sinceSeason,
  );
  const logs = loadRuntimeGameLogs(dataLeague);
  if (logs?.games?.length) {
    const fromLogs = getTeamRecordFromLogs(
      logs.games,
      teamAbbr,
      recordSeasons,
    );
    if (fromLogs.games > 0) return fromLogs;
  }

  return getTeamSampleRecord(splits);
}
