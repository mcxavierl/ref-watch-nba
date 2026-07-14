import { crewKey, refSlug } from "../../lib/slug";
import { dedupeRefsInPlace } from "../../lib/merge-duplicate-refs";
import {
  collectRefTeamStats,
  pushRefTeamGame,
  type RefTeamGameRow,
} from "../../lib/ref-team-stats";
import { buildNflRefAnalyticsForOfficial } from "../../nfl/lib/ref-analytics";
import type {
  RefGameRecord,
  RefProfile,
  RefStatsFile,
  RefOfficial,
  TeamCrewSplit,
} from "../../../src/lib/types";
import { CFB_TEAM_ABBRS } from "../../../src/lib/cfb/teams";
import { shouldIngestCfbGame } from "./leagues-config";
import { FALLBACK_CFB } from "../../lib/baselines";
import { toCfbOfficials, normalizeName } from "./espn";
import {
  loadExtractedGames,
  type CfbExtractedGameRecord,
} from "./upsert";
import { appendCfbIngestError } from "./ingest-errors";
import { validateCfbGameSummaryContract } from "./contract";

const MIN_SAMPLE = 30;
const MIN_REF_ATTRIBUTED_GAMES = 50;

export type CfbGameLogEntry = {
  gameId: string;
  date: string;
  season: string;
  league: "CFB";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  totalFouls: number;
  homeFlags: number;
  awayFlags: number;
  homePenaltyYards: number;
  awayPenaltyYards: number;
  closingTotal: number;
  homeSpread: number;
  lineSource: "external" | "synthetic";
  officials: RefOfficial[];
};

interface TeamGameRow {
  totalPoints: number;
  totalFouls: number;
  overHit: boolean;
  teamFouls: number;
  opponentFouls: number;
  teamWin: boolean;
  isHome: boolean;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function loadOfficialRoster(seed: RefStatsFile): Map<string, number> {
  const roster = new Map<string, number>();
  for (const ref of seed.refs) {
    roster.set(normalizeName(ref.name), ref.number);
  }
  return roster;
}

function buildTeamSplit(
  key: string,
  crewNames: string[],
  games: TeamGameRow[],
  leagueAvgTotal: number,
): TeamCrewSplit {
  const n = games.length;
  const wins = games.filter((g) => g.teamWin).length;
  const homeGames = games.filter((g) => g.isHome);
  const awayGames = games.filter((g) => !g.isHome);
  const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / n;
  const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / n;
  const avgTeamFouls = games.reduce((s, g) => s + g.teamFouls, 0) / n;
  const avgOpponentFouls = games.reduce((s, g) => s + g.opponentFouls, 0) / n;

  return {
    crewKey: key,
    crewNames,
    games: n,
    avgTotalPoints: round1(avgTotal),
    overRate: round3(games.filter((g) => g.overHit).length / n),
    avgFouls: round1(avgFouls),
    wins,
    losses: n - wins,
    totalDelta: round1(avgTotal - leagueAvgTotal),
    homeGames: homeGames.length,
    awayGames: awayGames.length,
    homeWins: homeGames.filter((g) => g.teamWin).length,
    homeLosses: homeGames.filter((g) => !g.teamWin).length,
    awayWins: awayGames.filter((g) => g.teamWin).length,
    awayLosses: awayGames.filter((g) => !g.teamWin).length,
    avgTeamFouls: round1(avgTeamFouls),
    avgOpponentFouls: round1(avgOpponentFouls),
    foulDifferential: round1(avgTeamFouls - avgOpponentFouls),
  };
}

function recordToSummary(record: CfbExtractedGameRecord) {
  return {
    gameId: record.gameId,
    date: record.date,
    season: record.season,
    awayAbbr: record.awayAbbr,
    homeAbbr: record.homeAbbr,
    awayScore: record.awayScore,
    homeScore: record.homeScore,
    homeFlags: record.homeFlags,
    awayFlags: record.awayFlags,
    homePenaltyYards: record.homePenaltyYards,
    awayPenaltyYards: record.awayPenaltyYards,
    closingTotal: record.closingTotal,
    homeSpread: record.homeSpread,
    lineSource: record.lineSource,
    officials: record.officials,
    status: record.status,
  };
}

function toCfbGameLog(
  record: CfbExtractedGameRecord,
  crew: RefOfficial[],
): CfbGameLogEntry {
  return {
    gameId: record.gameId,
    date: record.date,
    season: record.season,
    league: "CFB",
    homeTeam: record.homeAbbr,
    awayTeam: record.awayAbbr,
    homeScore: record.homeScore,
    awayScore: record.awayScore,
    totalPoints: record.homeScore + record.awayScore,
    totalFouls: record.homeFlags + record.awayFlags,
    homeFlags: record.homeFlags,
    awayFlags: record.awayFlags,
    homePenaltyYards: record.homePenaltyYards,
    awayPenaltyYards: record.awayPenaltyYards,
    closingTotal: record.closingTotal,
    homeSpread: record.homeSpread,
    lineSource: record.lineSource,
    officials: crew,
  };
}

export interface CfbTransformResult {
  stats: RefStatsFile | null;
  gameLogs: CfbGameLogEntry[];
  refAttributedGames: number;
  gamesWithoutOfficials: number;
  contractSkipped: number;
  conferenceSkipped: number;
}

export function transformExtractedCfbGames(
  seed: RefStatsFile,
  options: { leagueSlug?: string } = {},
): CfbTransformResult {
  const extracted = loadExtractedGames();
  const roster = loadOfficialRoster(seed);

  const refGames = new Map<string, RefGameRecord[]>();
  const refMeta = new Map<string, { name: string; number: number }>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const teamByCrew = new Map<
    string,
    Map<string, { crewNames: string[]; games: TeamGameRow[] }>
  >();
  const exportedGameLogs: CfbGameLogEntry[] = [];
  const allDates: string[] = [];
  const seasonsSeen = new Set<string>();
  let refAttributedGames = 0;
  let gamesWithoutOfficials = 0;
  let contractSkipped = 0;
  let conferenceSkipped = 0;
  let linedGames = 0;

  for (const abbr of CFB_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }

  for (const record of Object.values(extracted.games)) {
    const contract = validateCfbGameSummaryContract(recordToSummary(record));
    if (!contract.valid) {
      contractSkipped++;
      appendCfbIngestError({
        phase: "transform",
        gameId: record.gameId,
        message: "Skipping transform for contract-invalid game",
        details: contract.violations,
      });
      continue;
    }

    const trackedHome = CFB_TEAM_ABBRS.includes(record.homeAbbr);
    const trackedAway = CFB_TEAM_ABBRS.includes(record.awayAbbr);
    if (!trackedHome && !trackedAway) continue;

    if (!shouldIngestCfbGame(record.homeAbbr, record.awayAbbr, options.leagueSlug)) {
      conferenceSkipped++;
      continue;
    }

    const crew =
      record.officials.length > 0
        ? toCfbOfficials(record.officials, roster)
        : [];
    if (crew.length === 0) gamesWithoutOfficials++;

    const totalPoints = record.homeScore + record.awayScore;
    const totalFouls = record.homeFlags + record.awayFlags;
    const totalPenaltyYards = record.homePenaltyYards + record.awayPenaltyYards;
    const overHit = totalPoints > record.closingTotal;
    if (record.lineSource === "external") linedGames++;
    seasonsSeen.add(record.season);

    allDates.push(record.date);
    exportedGameLogs.push(toCfbGameLog(record, crew));

    if (crew.length === 0) continue;
    refAttributedGames++;

    const gameRecord: RefGameRecord = {
      gameId: record.gameId,
      date: record.date,
      season: record.season,
      homeTeam: record.homeAbbr,
      awayTeam: record.awayAbbr,
      totalPoints,
      totalFouls,
      overHit,
      raptorsInvolved: false,
      homeFlags: record.homeFlags,
      awayFlags: record.awayFlags,
      homePenaltyYards: record.homePenaltyYards,
      awayPenaltyYards: record.awayPenaltyYards,
      totalPenaltyYards,
      closingTotal: record.closingTotal,
      homeSpread: record.homeSpread,
    };

    const key = crewKey(crew);
    const crewNames = crew.map((o) => o.name);

    const makeRow = (teamAbbr: string): TeamGameRow | null => {
      if (!CFB_TEAM_ABBRS.includes(teamAbbr)) return null;
      const isHome = record.homeAbbr === teamAbbr;
      const isAway = record.awayAbbr === teamAbbr;
      if (!isHome && !isAway) return null;
      const teamWin = isHome
        ? record.homeScore > record.awayScore
        : record.awayScore > record.homeScore;
      return {
        totalPoints,
        totalFouls,
        overHit,
        teamFouls: isHome ? record.homeFlags : record.awayFlags,
        opponentFouls: isHome ? record.awayFlags : record.homeFlags,
        teamWin,
        isHome,
      };
    };

    for (const teamAbbr of [record.homeAbbr, record.awayAbbr]) {
      const buckets = teamByCrew.get(teamAbbr);
      if (!buckets) continue;
      const row = makeRow(teamAbbr);
      if (!row) continue;
      const existing = buckets.get(key) ?? { crewNames, games: [] };
      existing.games.push(row);
      buckets.set(key, existing);
    }

    for (const official of crew) {
      const slug = refSlug(official.name, official.number);
      refMeta.set(slug, official);
      const games = refGames.get(slug) ?? [];
      games.push(gameRecord);
      refGames.set(slug, games);

      for (const teamAbbr of [record.homeAbbr, record.awayAbbr]) {
        const row = makeRow(teamAbbr);
        if (!row) continue;
        pushRefTeamGame(refTeamBuckets, slug, teamAbbr, {
          foulDifferential: row.teamFouls - row.opponentFouls,
          totalPoints: row.totalPoints,
          overHit: row.overHit,
          teamWin: row.teamWin,
        });
      }
    }
  }

  if (refAttributedGames < MIN_REF_ATTRIBUTED_GAMES) {
    return {
      stats: null,
      gameLogs: exportedGameLogs,
      refAttributedGames,
      gamesWithoutOfficials,
      contractSkipped,
      conferenceSkipped,
    };
  }

  allDates.sort();
  const allGameRecords = [...refGames.values()].flat();
  const leagueAvgTotal =
    allGameRecords.reduce((s, g) => s + g.totalPoints, 0) /
    allGameRecords.length;
  const leagueAvgFouls =
    allGameRecords.reduce((s, g) => s + g.totalFouls, 0) /
    allGameRecords.length;
  const leagueAvgPenaltyYards =
    allGameRecords.reduce((s, g) => s + (g.totalPenaltyYards ?? 0), 0) /
    allGameRecords.length;

  const refs: RefProfile[] = [];
  for (const [slug, games] of refGames) {
    const meta = refMeta.get(slug)!;
    const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
    const overRate = games.filter((g) => g.overHit).length / games.length;
    const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / games.length;
    const seasons = [...new Set(games.map((g) => g.season))].sort();
    refs.push({
      slug,
      name: meta.name,
      number: meta.number,
      games: games.length,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate: null,
      totalPointsDelta: round1(avgTotal - leagueAvgTotal),
      foulsDelta: round1(avgFouls - leagueAvgFouls),
      seasons,
      recentGames: [...games]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8),
      teamStats: collectRefTeamStats(refTeamBuckets.get(slug) ?? new Map()),
      cfbAnalytics: buildNflRefAnalyticsForOfficial(
        games,
        games,
        leagueAvgFouls,
        leagueAvgPenaltyYards,
      ),
    });
  }

  refs.sort((a, b) => b.games - a.games);
  dedupeRefsInPlace(refs, leagueAvgTotal, leagueAvgFouls);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const [abbr, buckets] of teamByCrew) {
    if (!buckets || buckets.size === 0) continue;
    teamSplits[abbr] = [...buckets.entries()]
      .map(([key, data]) =>
        buildTeamSplit(key, data.crewNames, data.games, leagueAvgTotal),
      )
      .sort((a, b) => b.games - a.games);
  }

  const qualifiedPairs = refs.reduce(
    (sum, ref) =>
      sum +
      Object.values(ref.teamStats ?? {}).filter((stat) => stat.games >= 3)
        .length,
    0,
  );
  const teamStatsPairs = refs.reduce(
    (sum, ref) => sum + Object.keys(ref.teamStats ?? {}).length,
    0,
  );

  const stats: RefStatsFile = {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: [...seasonsSeen].sort(),
      leagueAvgTotal: round1(leagueAvgTotal),
      leagueAvgFouls: round1(leagueAvgFouls),
      leagueOverBaseline: round1(linedGames > 0 ? leagueAvgTotal : leagueAvgTotal),
      leagueAvgPenaltyYards: round1(leagueAvgPenaltyYards),
      minSampleSize: MIN_SAMPLE,
      source: "espn",
      data_verified: true,
      data_source: "ESPN",
      atsAvailable: false,
      refCount: refs.length,
      totalGamesProcessed: refAttributedGames,
      dateRange: {
        earliest: allDates[0] ?? "",
        latest: allDates.at(-1) ?? "",
      },
      note:
        `Scores, penalties, and referee crews from ESPN (${refAttributedGames} ref-attributed games, ` +
        `${exportedGameLogs.length} total game logs across ${CFB_TEAM_ABBRS.length} tracked programs, ` +
        `${linedGames} with sportsbook totals). ` +
        `${gamesWithoutOfficials} games ingested without ESPN officials (game logs only). ` +
        `Matrix: ${qualifiedPairs}/${teamStatsPairs} ref×team pairs with 3+ games.`,
    },
    refs,
    teamSplits,
  };

  return {
    stats,
    gameLogs: exportedGameLogs,
    refAttributedGames,
    gamesWithoutOfficials,
    contractSkipped,
    conferenceSkipped,
  };
}

export function emptyCfbSeed(): RefStatsFile {
  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: [],
      leagueAvgTotal: FALLBACK_CFB.leagueAvgTotal,
      leagueAvgFouls: FALLBACK_CFB.leagueAvgFouls,
      leagueOverBaseline: FALLBACK_CFB.leagueOverBaseline,
      leagueAvgPenaltyYards: FALLBACK_CFB.leagueAvgPenaltyYards,
      minSampleSize: MIN_SAMPLE,
      source: "seeded",
      data_verified: false,
      data_source: "bootstrap",
      atsAvailable: false,
    },
    refs: [],
    teamSplits: {},
  };
}
