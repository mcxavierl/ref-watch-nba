#!/usr/bin/env npx tsx
/**
 * Live NFL backfill from ESPN: scores, penalties, and official crews.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { crewKey, refSlug } from "../lib/slug";
import {
  collectRefTeamStats,
  pushRefTeamGame,
  type RefTeamGameRow,
} from "../lib/ref-team-stats";
import type {
  RefGameRecord,
  RefProfile,
  RefStatsFile,
  RefRole,
  TeamCrewSplit,
} from "../../src/lib/types";
import {
  fetchEspnScoreboard,
  fetchEspnSummary,
  inferNflSeason,
  sleep,
  toRefOfficials,
  yyyymmdd,
} from "./lib/espn";
import {
  computeLeagueAvgFlags,
  computeLeagueAvgPenaltyYards,
  computeNflRefAnalytics,
} from "./lib/ref-analytics";
import { buildBaselinesFile, saveBaselines } from "../lib/baselines";
import { loadGameLogs } from "../lib/game-logs";

const NFL_TEAM_ABBRS = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN",
  "DET", "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA",
  "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB",
  "TEN", "WAS",
];

const MIN_SAMPLE = 30;
const LEAGUE_OVER_BASELINE = 46;
const DATA_DIR = path.join(process.cwd(), "data", "nfl");

type NflGameLogEntry = {
  gameId: string;
  date: string;
  season: string;
  league: "NFL";
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
  lineSource: "synthetic" | "external";
  officials: { name: string; number: number; role: RefRole }[];
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

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function loadOfficialRoster(seed: RefStatsFile): Map<string, number> {
  const roster = new Map<string, number>();
  for (const ref of seed.refs) {
    roster.set(
      ref.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z\s]/g, "")
        .trim(),
      ref.number,
    );
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

async function buildFromEspn(seed: RefStatsFile): Promise<RefStatsFile | null> {
  const roster = loadOfficialRoster(seed);
  const dates = dateRange("2024-08-01", "2025-02-15");

  const refGames = new Map<string, RefGameRecord[]>();
  const refMeta = new Map<string, { name: string; number: number; role: RefRole }>();
  const refMinorGames = new Map<string, RefGameRecord[]>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const teamByCrew = new Map<string, Map<string, { crewNames: string[]; games: TeamGameRow[] }>>();
  const exportedGameLogs: NflGameLogEntry[] = [];
  const allDates: string[] = [];
  let processed = 0;

  for (const abbr of NFL_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }

  for (const date of dates) {
    const compact = date.replace(/-/g, "");
    let events;
    try {
      events = await fetchEspnScoreboard(compact);
    } catch (err) {
      console.warn(`Scoreboard ${date}: ${err}`);
      await sleep(300);
      continue;
    }

    if (events.length === 0) continue;

    for (const event of events) {
      if (event.status !== "STATUS_FINAL") continue;

      await sleep(120);
      let summary;
      try {
        summary = await fetchEspnSummary(event.id);
      } catch (err) {
        console.warn(`Summary ${event.id}: ${err}`);
        continue;
      }
      if (!summary || summary.officials.length === 0) continue;

      const homeTeam = summary.homeAbbr;
      const awayTeam = summary.awayAbbr;
      if (!NFL_TEAM_ABBRS.includes(homeTeam) || !NFL_TEAM_ABBRS.includes(awayTeam)) {
        continue;
      }

      const totalPoints = summary.homeScore + summary.awayScore;
      const totalFouls = summary.homeFlags + summary.awayFlags;
      const totalPenaltyYards =
        summary.homePenaltyYards + summary.awayPenaltyYards;
      const season = inferNflSeason(summary.date);
      const crew = toRefOfficials(summary.officials, roster);
      const overHit = totalPoints > LEAGUE_OVER_BASELINE;

      const record: RefGameRecord = {
        gameId: summary.gameId,
        date: summary.date,
        season,
        homeTeam,
        awayTeam,
        totalPoints,
        totalFouls,
        homeFlags: summary.homeFlags,
        awayFlags: summary.awayFlags,
        homePenaltyYards: summary.homePenaltyYards,
        awayPenaltyYards: summary.awayPenaltyYards,
        totalPenaltyYards,
        overHit,
        raptorsInvolved: false,
        closingTotal: LEAGUE_OVER_BASELINE,
        homeSpread: 0,
      };

      allDates.push(summary.date);
      exportedGameLogs.push({
        gameId: summary.gameId,
        date: summary.date,
        season,
        league: "NFL",
        homeTeam,
        awayTeam,
        homeScore: summary.homeScore,
        awayScore: summary.awayScore,
        totalPoints,
        totalFouls,
        homeFlags: summary.homeFlags,
        awayFlags: summary.awayFlags,
        homePenaltyYards: summary.homePenaltyYards,
        awayPenaltyYards: summary.awayPenaltyYards,
        closingTotal: LEAGUE_OVER_BASELINE,
        homeSpread: 0,
        lineSource: "synthetic",
        officials: crew,
      });

      const key = crewKey(crew);
      const crewNames = crew.map((o) => o.name);

      const makeRow = (teamAbbr: string): TeamGameRow | null => {
        const isHome = homeTeam === teamAbbr;
        const isAway = awayTeam === teamAbbr;
        if (!isHome && !isAway) return null;
        const teamWin = isHome
          ? summary.homeScore > summary.awayScore
          : summary.awayScore > summary.homeScore;
        return {
          totalPoints,
          totalFouls,
          overHit,
          teamFouls: isHome ? summary.homeFlags : summary.awayFlags,
          opponentFouls: isHome ? summary.awayFlags : summary.homeFlags,
          teamWin,
          isHome,
        };
      };

      for (const teamAbbr of [homeTeam, awayTeam]) {
        const row = makeRow(teamAbbr);
        if (!row) continue;
        const buckets = teamByCrew.get(teamAbbr)!;
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

        if (official.role === "referee") {
          const refOnly = refMinorGames.get(slug) ?? [];
          refOnly.push(record);
          refMinorGames.set(slug, refOnly);
        }

        for (const teamAbbr of [homeTeam, awayTeam]) {
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

      processed++;
    }
    await sleep(100);
  }

  if (processed < 50) {
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
  const leagueAvgPenaltyYards = computeLeagueAvgPenaltyYards(allGameRecords);
  const leagueAvgFlags = computeLeagueAvgFlags(allGameRecords);

  const refs: RefProfile[] = [];
  for (const [slug, games] of refGames) {
    const meta = refMeta.get(slug)!;
    const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
    const overRate = games.filter((g) => g.overHit).length / games.length;
    const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / games.length;
    const refOnly = refMinorGames.get(slug) ?? [];
    const nflAnalytics =
      meta.role === "referee"
        ? computeNflRefAnalytics(refOnly, leagueAvgFlags, leagueAvgPenaltyYards)
        : undefined;

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
      seasons: [...new Set(games.map((g) => g.season))],
      recentGames: games.slice(-8).reverse(),
      teamStats: collectRefTeamStats(refTeamBuckets.get(slug) ?? new Map()),
      nflAnalytics,
    });
  }
  refs.sort((a, b) => b.games - a.games);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const abbr of NFL_TEAM_ABBRS) {
    teamSplits[abbr] = [...teamByCrew.get(abbr)!.entries()]
      .map(([key, data]) =>
        buildTeamSplit(key, data.crewNames, data.games, leagueAvgTotal),
      )
      .sort((a, b) => b.games - a.games);
  }

  fs.writeFileSync(
    path.join(DATA_DIR, "game-logs.json"),
    `${JSON.stringify(
      {
        lastUpdated: new Date().toISOString(),
        league: "NFL",
        source: "espn",
        games: exportedGameLogs.sort(
          (a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
        ),
      },
      null,
      2,
    )}\n`,
  );

  const nbaLogs = loadGameLogs("NBA")?.games ?? [];
  const nhlLogs = loadGameLogs("NHL")?.games ?? [];
  saveBaselines(
    buildBaselinesFile(
      nbaLogs,
      nhlLogs,
      `NFL ESPN build: ${processed} games`,
      exportedGameLogs,
    ),
  );

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: [...new Set(refs.flatMap((r) => r.seasons))].sort(),
      leagueAvgTotal: round1(leagueAvgTotal),
      leagueAvgFouls: round1(leagueAvgFouls),
      leagueOverBaseline: LEAGUE_OVER_BASELINE,
      leagueAvgPenaltyYards,
      minSampleSize: MIN_SAMPLE,
      source: "espn",
      atsAvailable: false,
      refCount: refs.length,
      totalGamesProcessed: processed,
      dateRange: {
        earliest: allDates[0],
        latest: allDates[allDates.length - 1],
      },
      note:
        "Scores, penalty counts, and crews from ESPN. Ref×team W-L from those games. No verified closing lines — ATS/O-U splits hidden.",
    },
    refs,
    teamSplits,
  };
}

async function main() {
  const statsPath = path.join(DATA_DIR, "ref-stats.json");
  const seedPath = path.join(DATA_DIR, "ref-stats.seed.json");

  console.log("=== Ref Watch NFL data build (ESPN) ===\n");

  let seed: RefStatsFile;
  try {
    seed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as RefStatsFile;
  } catch {
    seed = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;
  }

  const built = await buildFromEspn(seed);
  if (built) {
    fs.writeFileSync(statsPath, `${JSON.stringify(built, null, 2)}\n`);
    console.log(
      `Built ${built.meta.totalGamesProcessed} games, ${built.refs.length} officials (source: espn)`,
    );
  } else {
    const honest: RefStatsFile = {
      ...seed,
      meta: {
        ...seed.meta,
        source: "seeded",
        atsAvailable: false,
        lastUpdated: new Date().toISOString(),
        note:
          "Simulated preview data — not verified against official NFL records. Run build when ESPN backfill succeeds.",
      },
    };
    fs.writeFileSync(statsPath, `${JSON.stringify(honest, null, 2)}\n`);
    console.log("ESPN backfill insufficient — wrote honest seeded fallback.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
