import type { LeagueId } from "@/lib/leagues";

/** NBA-style season labels for a ten-season window ending 2025-26. */
export const NBA_TEN_SEASONS = [
  "2016-17",
  "2017-18",
  "2018-19",
  "2019-20",
  "2020-21",
  "2021-22",
  "2022-23",
  "2023-24",
  "2024-25",
  "2025-26",
] as const;

export const NHL_TEN_SEASONS = [...NBA_TEN_SEASONS] as const;
export const NFL_TEN_SEASONS = [...NBA_TEN_SEASONS] as const;
export const CBB_TEN_SEASONS = [...NBA_TEN_SEASONS] as const;
export const CFB_TEN_SEASONS = [...NBA_TEN_SEASONS] as const;

/** EPL uses the same label format; ESPN backfill may cover fewer seasons. */
export const EPL_TEN_SEASONS = [...NBA_TEN_SEASONS] as const;

export const DEFAULT_SINCE_SEASON = "2016-17";

export const CURRENT_SEASON_LABEL = "2025-26";

const LEAGUE_TEN_SEASONS: Partial<Record<LeagueId, readonly string[]>> = {
  nba: NBA_TEN_SEASONS,
  nhl: NHL_TEN_SEASONS,
  nfl: NFL_TEN_SEASONS,
  epl: EPL_TEN_SEASONS,
  cbb: CBB_TEN_SEASONS,
  cfb: CFB_TEN_SEASONS,
  wnba: NBA_TEN_SEASONS,
  mlb: NBA_TEN_SEASONS,
};

export function leagueTenSeasons(leagueId: LeagueId): readonly string[] {
  return LEAGUE_TEN_SEASONS[leagueId] ?? NBA_TEN_SEASONS;
}

export function buildSeasonLabels(
  startYear: number,
  count: number,
): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const y = startYear + i;
    const end = String((y + 1) % 100).padStart(2, "0");
    out.push(`${y}-${end}`);
  }
  return out;
}

export function dataLeagueTenSeasons(
  dataLeague: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB",
): readonly string[] {
  const map: Record<string, readonly string[]> = {
    NBA: NBA_TEN_SEASONS,
    NHL: NHL_TEN_SEASONS,
    NFL: NFL_TEN_SEASONS,
    EPL: EPL_TEN_SEASONS,
    CBB: CBB_TEN_SEASONS,
    CFB: CFB_TEN_SEASONS,
  };
  return map[dataLeague] ?? NBA_TEN_SEASONS;
}
