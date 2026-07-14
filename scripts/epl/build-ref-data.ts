#!/usr/bin/env npx tsx
/**
 * Live EPL backfill from ESPN: scores, fouls, cards, and referee assignments.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { crewKey, refSlug } from "../lib/slug";
import { dedupeRefsInPlace } from "../lib/merge-duplicate-refs";
import {
  collectRefTeamStats,
  pushRefTeamGame,
  type RefTeamGameRow,
} from "../lib/ref-team-stats";
import type {
  RefGameRecord,
  RefProfile,
  RefStatsFile,
  TeamCrewSplit,
} from "../../src/lib/types";
import { EPL_TEAM_ABBRS } from "../../src/lib/epl/teams";
import {
  computeEplRefAnalytics,
  computeLeagueAvgPenalties,
  computeLeagueAvgRed,
  computeLeagueAvgYellow,
  type EplGameCardStats,
} from "./lib/ref-analytics";
import {
  fetchEplSummary,
  fetchSeasonEventIds,
  normalizeName,
  sleep,
  toEplOfficials,
} from "./lib/espn";
import {
  buildBaselinesFile,
  loadBaselines,
  saveBaselines,
} from "../lib/baselines";
import { EPL_TEN_SEASONS, espnSeasonStartYear } from "../lib/ten-season-policy";
import { loadGameLogs } from "../lib/game-logs";

const DATA_DIR = path.join(process.cwd(), "data", "epl");
const MIN_SAMPLE = 30;
const LEAGUE_OVER_BASELINE = 2.5;
const ESPN_SEASONS = EPL_TEN_SEASONS.map(espnSeasonStartYear);

type EplGameLogEntry = {
  gameId: string;
  date: string;
  season: string;
  league: "EPL";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  totalFouls: number;
  homeFouls: number;
  awayFouls: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
  homePenalties: number;
  awayPenalties: number;
  closingTotal: number;
  homeSpread: number;
  lineSource: "external" | "synthetic";
  officials: { name: string; number: number; role: "referee" }[];
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

type EplRefGameRecord = RefGameRecord & EplGameCardStats;

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

function toEplGameLog(
  summary: Awaited<ReturnType<typeof fetchEplSummary>>,
  crew: ReturnType<typeof toEplOfficials>,
): EplGameLogEntry | null {
  if (!summary) return null;
  return {
    gameId: summary.gameId,
    date: summary.date,
    season: summary.season,
    league: "EPL",
    homeTeam: summary.homeAbbr,
    awayTeam: summary.awayAbbr,
    homeScore: summary.homeScore,
    awayScore: summary.awayScore,
    totalPoints: summary.homeScore + summary.awayScore,
    totalFouls: summary.homeFouls + summary.awayFouls,
    homeFouls: summary.homeFouls,
    awayFouls: summary.awayFouls,
    homeYellowCards: summary.homeYellowCards,
    awayYellowCards: summary.awayYellowCards,
    homeRedCards: summary.homeRedCards,
    awayRedCards: summary.awayRedCards,
    homePenalties: summary.homePenalties,
    awayPenalties: summary.awayPenalties,
    closingTotal: summary.closingTotal,
    homeSpread: summary.homeSpread,
    lineSource: summary.lineSource,
    officials: crew,
  };
}

async function buildFromEspn(seed: RefStatsFile): Promise<{
  stats: RefStatsFile;
  gameLogs: EplGameLogEntry[];
} | null> {
  const roster = loadOfficialRoster(seed);
  const refGames = new Map<string, EplRefGameRecord[]>();
  const refMeta = new Map<string, { name: string; number: number }>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const teamByCrew = new Map<
    string,
    Map<string, { crewNames: string[]; games: TeamGameRow[] }>
  >();
  const exportedGameLogs: EplGameLogEntry[] = [];
  const allDates: string[] = [];
  const seasonsSeen = new Set<string>();
  let processed = 0;
  let linedGames = 0;
  let skippedNoOfficial = 0;

  for (const abbr of EPL_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }

  for (const espnSeasonYear of ESPN_SEASONS) {
    console.log(`Fetching ${inferSeasonLabel(espnSeasonYear)} event list...`);
    const eventIds = await fetchSeasonEventIds(espnSeasonYear);
    console.log(`  ${eventIds.length} events`);

    for (const eventId of eventIds) {
      await sleep(90);
      let summary;
      try {
        summary = await fetchEplSummary(eventId, espnSeasonYear);
      } catch (err) {
        console.warn(`Summary ${eventId}: ${err}`);
        continue;
      }
      if (!summary || summary.officials.length === 0) {
        skippedNoOfficial++;
        continue;
      }

      const crew = toEplOfficials(summary.officials, roster);
      const totalPoints = summary.homeScore + summary.awayScore;
      const totalFouls = summary.homeFouls + summary.awayFouls;
      const overHit = totalPoints > summary.closingTotal;
      if (summary.lineSource === "external") linedGames++;
      seasonsSeen.add(summary.season);

      const record: EplRefGameRecord = {
        gameId: summary.gameId,
        date: summary.date,
        season: summary.season,
        homeTeam: summary.homeAbbr,
        awayTeam: summary.awayAbbr,
        totalPoints,
        totalFouls,
        overHit,
        raptorsInvolved: false,
        closingTotal: summary.closingTotal,
        homeSpread: summary.homeSpread,
        homeYellowCards: summary.homeYellowCards,
        awayYellowCards: summary.awayYellowCards,
        homeRedCards: summary.homeRedCards,
        awayRedCards: summary.awayRedCards,
        homePenalties: summary.homePenalties,
        awayPenalties: summary.awayPenalties,
      };

      allDates.push(summary.date);
      const logEntry = toEplGameLog(summary, crew);
      if (logEntry) exportedGameLogs.push(logEntry);

      const key = crewKey(crew);
      const crewNames = crew.map((o) => o.name);

      const makeRow = (teamAbbr: string): TeamGameRow | null => {
        const isHome = summary.homeAbbr === teamAbbr;
        const isAway = summary.awayAbbr === teamAbbr;
        if (!isHome && !isAway) return null;
        const teamWin = isHome
          ? summary.homeScore > summary.awayScore
          : summary.awayScore > summary.homeScore;
        return {
          totalPoints,
          totalFouls,
          overHit,
          teamFouls: isHome ? summary.homeFouls : summary.awayFouls,
          opponentFouls: isHome ? summary.awayFouls : summary.homeFouls,
          teamWin,
          isHome,
        };
      };

      for (const teamAbbr of [summary.homeAbbr, summary.awayAbbr]) {
        const row = makeRow(teamAbbr);
        if (!row) continue;
        const buckets = teamByCrew.get(teamAbbr);
        if (!buckets) continue;
        const existing = buckets.get(key) ?? { crewNames, games: [] };
        existing.games.push(row);
        buckets.set(key, existing);
      }

      for (const official of crew) {
        const slug = refSlug(official.name, official.number);
        refMeta.set(slug, official);
        const games = refGames.get(slug) ?? [];
        games.push(record);
        refGames.set(slug, games);

        for (const teamAbbr of [summary.homeAbbr, summary.awayAbbr]) {
          const row = makeRow(teamAbbr);
          if (!row) continue;
          const isHome = summary.homeAbbr === teamAbbr;
          const teamYellow = isHome
            ? summary.homeYellowCards
            : summary.awayYellowCards;
          const opponentYellow = isHome
            ? summary.awayYellowCards
            : summary.homeYellowCards;
          pushRefTeamGame(refTeamBuckets, slug, teamAbbr, {
            foulDifferential: row.teamFouls - row.opponentFouls,
            technicalFoulDifferential: teamYellow - opponentYellow,
            totalPoints: row.totalPoints,
            overHit: row.overHit,
            teamWin: row.teamWin,
          });
        }
      }

      processed++;
      if (processed % 50 === 0) {
        console.log(`  processed ${processed} games...`);
      }
    }
  }

  if (processed < 100) {
    console.warn(`Only ${processed} ESPN games — keeping seed fallback.`);
    return null;
  }

  allDates.sort();
  const allGameRecords = [...refGames.values()].flat();
  const leagueAvgTotal =
    allGameRecords.reduce((s, g) => s + g.totalPoints, 0) /
    allGameRecords.length;
  const leagueAvgFouls =
    allGameRecords.reduce((s, g) => s + g.totalFouls, 0) /
    allGameRecords.length;
  const leagueAvgYellow = computeLeagueAvgYellow(allGameRecords);
  const leagueAvgRed = computeLeagueAvgRed(allGameRecords);
  const leagueAvgPenalties = computeLeagueAvgPenalties(allGameRecords);

  const refs: RefProfile[] = [];
  for (const [slug, games] of refGames) {
    const meta = refMeta.get(slug)!;
    const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
    const overRate = games.filter((g) => g.overHit).length / games.length;
    const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / games.length;
    const seasons = [...new Set(games.map((g) => g.season))].sort();
    const eplAnalytics = computeEplRefAnalytics(
      games,
      leagueAvgTotal,
      leagueAvgFouls,
      leagueAvgYellow,
      leagueAvgRed,
      leagueAvgPenalties,
    );

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
      eplAnalytics,
    });
  }

  refs.sort((a, b) => b.games - a.games);
  dedupeRefsInPlace(refs, leagueAvgTotal, leagueAvgFouls);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const abbr of EPL_TEAM_ABBRS) {
    const buckets = teamByCrew.get(abbr);
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
      leagueOverBaseline: round1(
        linedGames > 0 ? LEAGUE_OVER_BASELINE : leagueAvgTotal,
      ),
      leagueAvgYellowCards: leagueAvgYellow,
      leagueAvgRedCards: leagueAvgRed,
      leagueAvgPenalties: leagueAvgPenalties,
      minSampleSize: MIN_SAMPLE,
      source: "espn",
      data_verified: true,
      data_source: "ESPN",
      atsAvailable: false,
      refCount: refs.length,
      totalGamesProcessed: processed,
      dateRange: {
        earliest: allDates[0] ?? "",
        latest: allDates.at(-1) ?? "",
      },
      note:
        `Scores, fouls, cards, and referee assignments from ESPN (${processed} games, ${linedGames} with sportsbook totals). ` +
        `Matrix: ${qualifiedPairs}/${teamStatsPairs} ref×team pairs with 3+ games. ` +
        `${skippedNoOfficial} games skipped (no official listed).`,
    },
    refs,
    teamSplits,
  };

  return { stats, gameLogs: exportedGameLogs };
}

function inferSeasonLabel(espnSeasonYear: number): string {
  const end = (espnSeasonYear + 1) % 100;
  return `${espnSeasonYear}-${String(end).padStart(2, "0")}`;
}

function updateEplBaselines(gameLogs: EplGameLogEntry[]): void {
  const nba = loadGameLogs("NBA");
  const nhl = loadGameLogs("NHL");
  const nfl = loadGameLogs("NFL");
  const existing = loadBaselines();
  const eplGames = gameLogs.map((g) => ({
    gameId: g.gameId,
    date: g.date,
    season: g.season,
    league: "EPL" as const,
    homeTeam: g.homeTeam,
    awayTeam: g.awayTeam,
    homeScore: g.homeScore,
    awayScore: g.awayScore,
    totalPoints: g.totalPoints,
    totalFouls: g.totalFouls,
    closingTotal: g.closingTotal,
    homeSpread: g.homeSpread,
    lineSource: g.lineSource,
    officials: g.officials,
  }));

  const file = buildBaselinesFile(
    nba?.games ?? [],
    nhl?.games ?? [],
    "Computed from exported game logs (NBA, NHL, NFL, EPL)",
    nfl?.games ?? [],
    eplGames,
  );
  saveBaselines(file);
  console.log(
    `Baselines: EPL ${file.EPL.aggregate.gameCount} games (${file.EPL.usingFallback ? "fallback" : "computed"})`,
  );
}

async function main() {
  const statsPath = path.join(DATA_DIR, "ref-stats.json");
  const seedPath = path.join(DATA_DIR, "ref-stats.seed.json");

  console.log("=== Ref Watch EPL data build (ESPN) ===\n");

  let seed: RefStatsFile;
  try {
    seed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as RefStatsFile;
  } catch {
    try {
      seed = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;
    } catch {
      console.error("No EPL seed found. Run npm run generate-epl-seed first.");
      process.exit(1);
    }
  }

  const built = await buildFromEspn(seed);
  if (!built) {
    console.log("ESPN backfill insufficient — kept seed baseline.");
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(statsPath, `${JSON.stringify(built.stats, null, 2)}\n`);
  fs.writeFileSync(
    path.join(DATA_DIR, "game-logs.json"),
    `${JSON.stringify(
      {
        lastUpdated: new Date().toISOString(),
        league: "EPL",
        source: "espn",
        games: built.gameLogs,
      },
      null,
      2,
    )}\n`,
  );

  updateEplBaselines(built.gameLogs);

  const qualified = built.stats.refs.reduce(
    (sum, ref) =>
      sum +
      Object.values(ref.teamStats ?? {}).filter((stat) => stat.games >= 3)
        .length,
    0,
  );
  const pairs = built.stats.refs.reduce(
    (sum, ref) => sum + Object.keys(ref.teamStats ?? {}).length,
    0,
  );

  console.log(
    `Built ${built.stats.meta.totalGamesProcessed} ESPN games → ` +
      `${built.stats.refs.length} officials (${built.stats.meta.source})`,
  );
  console.log(`Team splits: ${Object.keys(built.stats.teamSplits).length} clubs`);
  console.log(`Matrix coverage: ${qualified}/${pairs} ref×team pairs with 3+ games`);
  console.log(`Game logs: ${built.gameLogs.length} matches → data/epl/game-logs.json`);

  console.log("\n--- Regenerating overview insights ---");
  const { runPostIngestInsightGenerator } = await import("../lib/post-ingest-insights");
  runPostIngestInsightGenerator();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
