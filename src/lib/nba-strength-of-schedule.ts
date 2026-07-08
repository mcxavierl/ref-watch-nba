import {
  getOfficialSeasonRecord,
  NBA_TEAM_ORDER,
  type TeamSeasonRecord,
} from "@/lib/nba-team-season-records";
import {
  filterTeamGameLogs,
  teamWonGameRow,
  type TeamGameLogRow,
  type TeamRecordQueryOptions,
} from "@/lib/team-record-query";

export type OpponentTier = "top10" | "mid10" | "bottom10";

export interface TierRecord {
  wins: number;
  losses: number;
  games: number;
  winRate: number;
}

export interface TeamStrengthOfSchedule {
  wins: number;
  losses: number;
  games: number;
  winRate: number;
  /** Weighted mean opponent season-end win% (0–1). */
  avgOpponentWinPct: number;
  expectedWins: number;
  expectedLosses: number;
  /** Actual wins minus expected wins for a .500 team on this schedule. */
  winsAboveExpected: number;
  splits: Record<OpponentTier, TierRecord>;
}

/** Bill James log5: win probability for team A vs team B given win rates (0–1). */
export function log5WinProbability(
  teamWinRate: number,
  opponentWinRate: number,
): number {
  const pA = teamWinRate;
  const pB = opponentWinRate;
  const denom = pA + pB - 2 * pA * pB;
  if (denom <= 0) return 0.5;
  return (pA - pA * pB) / denom;
}

export function seasonEndWinRate(
  teamAbbr: string,
  season: string,
): number | null {
  const row = getOfficialSeasonRecord(teamAbbr, season);
  if (!row) return null;
  const games = row.wins + row.losses;
  if (games === 0) return null;
  return row.wins / games;
}

/** Rank teams by season-end win%; ties broken by NBA_TEAM_ORDER index. */
export function opponentTiersForSeason(
  season: string,
): Record<string, OpponentTier> {
  const ranked = NBA_TEAM_ORDER.map((abbr, index) => {
    const row = getOfficialSeasonRecord(abbr, season);
    const games = row ? row.wins + row.losses : 0;
    const winRate = games > 0 && row ? row.wins / games : 0;
    return { abbr, winRate, index };
  }).sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return a.index - b.index;
  });

  const tiers: Record<string, OpponentTier> = {};
  ranked.forEach((entry, rank) => {
    const tier: OpponentTier =
      rank < 10 ? "top10" : rank < 20 ? "mid10" : "bottom10";
    tiers[entry.abbr] = tier;
  });
  return tiers;
}

function emptyTierRecord(): TierRecord {
  return { wins: 0, losses: 0, games: 0, winRate: 0 };
}

function addGameToTier(
  tiers: Record<OpponentTier, TierRecord>,
  tier: OpponentTier,
  won: boolean,
): void {
  const row = tiers[tier];
  if (won) row.wins++;
  else row.losses++;
  row.games = row.wins + row.losses;
  row.winRate = row.games > 0 ? row.wins / row.games : 0;
}

export function computeStrengthOfSchedule(
  games: TeamGameLogRow[],
  teamAbbr: string,
  options: TeamRecordQueryOptions = {},
): TeamStrengthOfSchedule | null {
  const filtered = filterTeamGameLogs(games, teamAbbr, options);
  if (filtered.length === 0) return null;

  const abbr = teamAbbr.toUpperCase();
  let wins = 0;
  let losses = 0;
  let oppWinPctSum = 0;
  let expectedWins = 0;
  const splits: Record<OpponentTier, TierRecord> = {
    top10: emptyTierRecord(),
    mid10: emptyTierRecord(),
    bottom10: emptyTierRecord(),
  };

  const tierCache = new Map<string, Record<string, OpponentTier>>();

  for (const game of filtered) {
    const won = teamWonGameRow(game, abbr);
    if (won === null) continue;
    if (won) wins++;
    else losses++;

    const opponent =
      game.homeTeam === abbr ? game.awayTeam : game.homeTeam;
    const oppWinPct = seasonEndWinRate(opponent, game.season);
    if (oppWinPct == null) continue;

    oppWinPctSum += oppWinPct;
    expectedWins += log5WinProbability(0.5, oppWinPct);

    let seasonTiers = tierCache.get(game.season);
    if (!seasonTiers) {
      seasonTiers = opponentTiersForSeason(game.season);
      tierCache.set(game.season, seasonTiers);
    }
    const tier = seasonTiers[opponent] ?? "mid10";
    addGameToTier(splits, tier, won);
  }

  const gamesCount = wins + losses;
  if (gamesCount === 0) return null;

  const expectedLosses = gamesCount - expectedWins;

  return {
    wins,
    losses,
    games: gamesCount,
    winRate: wins / gamesCount,
    avgOpponentWinPct: oppWinPctSum / gamesCount,
    expectedWins,
    expectedLosses,
    winsAboveExpected: wins - expectedWins,
    splits,
  };
}

export function roundExpectedRecord(
  expectedWins: number,
  expectedLosses: number,
): TeamSeasonRecord {
  return {
    wins: Math.round(expectedWins),
    losses: Math.round(expectedLosses),
  };
}

export function formatOpponentAvgWinPct(rate: number): string {
  return `.${Math.round(rate * 1000)
    .toString()
    .padStart(3, "0")}`;
}

export function formatWinsAboveExpected(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}`;
}
