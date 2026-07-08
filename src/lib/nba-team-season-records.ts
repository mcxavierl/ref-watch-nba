/** Official NBA regular-season W-L by team (Basketball-Reference standings). */

import { DEFAULT_SINCE_SEASON } from "@/lib/league-seasons";

export type TeamSeasonRecord = { wins: number; losses: number };

export type NbaSeasonRecords = Record<string, Record<string, TeamSeasonRecord>>;

/** Alphabetical by abbreviation — matches Basketball-Reference league wins tables. */
export const NBA_TEAM_ORDER = [
  "ATL", "BKN", "BOS", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
] as const;

/** First regular-season game date (UTC) per season label. */
export const NBA_SEASON_OPENERS: Record<string, string> = {
  "2016-17": "2016-10-25",
  "2017-18": "2017-10-17",
  "2018-19": "2018-10-16",
  "2019-20": "2019-10-22",
  "2020-21": "2020-12-22",
  "2021-22": "2021-10-20",
  "2022-23": "2022-10-18",
  "2023-24": "2023-10-24",
  "2024-25": "2024-10-22",
  "2025-26": "2025-10-21",
};

/** Wins-only rows from Basketball-Reference league wins tables (losses = 82 - wins). */
const SEASON_WINS: Record<string, number[]> = {
  "2016-17": [
    43, 20, 53, 36, 41, 51, 33, 40, 37, 67, 55, 42, 51, 26, 43, 41, 42, 31,
    34, 31, 47, 29, 28, 24, 41, 32, 61, 51, 51, 49,
  ],
  "2017-18": [
    24, 28, 55, 36, 27, 50, 24, 46, 39, 58, 65, 48, 42, 35, 22, 44, 44, 47,
    48, 29, 48, 25, 52, 21, 49, 27, 47, 59, 48, 43,
  ],
  "2018-19": [
    36, 42, 49, 39, 22, 19, 33, 54, 41, 57, 53, 48, 48, 37, 33, 39, 60, 36,
    33, 17, 49, 42, 51, 19, 53, 39, 48, 58, 50, 32,
  ],
  "2019-20": [
    20, 35, 48, 23, 22, 19, 43, 46, 20, 15, 44, 45, 49, 52, 34, 44, 56, 19,
    30, 21, 44, 33, 43, 34, 35, 31, 32, 53, 44, 25,
  ],
  "2020-21": [
    41, 48, 36, 33, 31, 22, 42, 47, 20, 39, 17, 34, 47, 42, 38, 40, 46, 23,
    31, 27, 22, 21, 49, 51, 42, 31, 33, 27, 52, 34,
  ],
  "2021-22": [
    43, 51, 44, 46, 43, 44, 52, 48, 23, 53, 20, 25, 42, 33, 56, 53, 51, 46,
    36, 37, 24, 22, 51, 64, 27, 30, 34, 48, 49, 35,
  ],
  "2022-23": [
    41, 45, 57, 27, 40, 51, 38, 53, 17, 44, 22, 35, 44, 43, 51, 44, 58, 42,
    42, 47, 40, 34, 54, 45, 33, 48, 22, 41, 37, 35,
  ],
  "2023-24": [
    36, 32, 64, 39, 21, 48, 50, 57, 14, 46, 41, 47, 51, 47, 27, 46, 49, 56,
    49, 50, 57, 47, 47, 49, 21, 46, 22, 25, 31, 15,
  ],
  "2024-25": [
    40, 61, 26, 39, 19, 64, 39, 50, 44, 48, 52, 50, 50, 50, 48, 37, 48, 49,
    21, 51, 68, 41, 24, 36, 36, 40, 34, 30, 17, 18,
  ],
  // 2025-26 final regular season (Basketball-Reference league table, audited Jul 2026).
  "2025-26": [
    46, 20, 56, 44, 31, 52, 26, 54, 60, 37, 52, 19, 42, 53, 25, 43, 32, 49,
    26, 53, 64, 45, 45, 45, 42, 22, 62, 46, 22, 17,
  ],
};

function buildSeasonRecords(wins: number[]): Record<string, TeamSeasonRecord> {
  const out: Record<string, TeamSeasonRecord> = {};
  NBA_TEAM_ORDER.forEach((abbr, i) => {
    const w = wins[i] ?? 0;
    out[abbr] = { wins: w, losses: 82 - w };
  });
  return out;
}

export const NBA_REGULAR_SEASON_RECORDS: NbaSeasonRecords = Object.fromEntries(
  Object.entries(SEASON_WINS).map(([season, wins]) => [
    season,
    buildSeasonRecords(wins),
  ]),
);

/** Seasons with audited final BBR regular-season standings in SEASON_WINS. */
export const NBA_AUDITED_FINAL_SEASONS = new Set(Object.keys(SEASON_WINS));

export { DEFAULT_SINCE_SEASON };

export function seasonRecordAuditNote(season: string): string | null {
  if (season === "2025-26") {
    return "2025-26 team records: final regular season per Basketball-Reference (audited Jul 2026).";
  }
  if (NBA_AUDITED_FINAL_SEASONS.has(season)) {
    return null;
  }
  return null;
}

export function nbaSeasonScopeAuditNote(seasons: string[]): string | null {
  if (seasons.includes("2025-26")) {
    return seasonRecordAuditNote("2025-26");
  }
  return null;
}

export function getOfficialSeasonRecord(
  teamAbbr: string,
  season: string,
): TeamSeasonRecord | undefined {
  return NBA_REGULAR_SEASON_RECORDS[season]?.[teamAbbr.toUpperCase()];
}

export function sumOfficialRegularSeasonRecord(
  teamAbbr: string,
  seasons: string[],
): TeamSeasonRecord {
  let wins = 0;
  let losses = 0;
  for (const season of seasons) {
    const row = getOfficialSeasonRecord(teamAbbr, season);
    if (!row) continue;
    wins += row.wins;
    losses += row.losses;
  }
  return { wins, losses };
}
