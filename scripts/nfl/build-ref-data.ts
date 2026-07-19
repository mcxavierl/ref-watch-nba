#!/usr/bin/env npx tsx
/**
 * Live NFL backfill from ESPN: scores, penalties, and official crews.
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
import { canonicalizeOfficialName } from "./lib/official-names";
import {
  computeLeagueAvgFlags,
  computeLeagueAvgPenaltyYards,
  buildNflRefAnalyticsForOfficial,
} from "./lib/ref-analytics";
import { buildBaselinesFile, saveBaselines } from "../lib/baselines";
import { loadGameLogs } from "../lib/game-logs";
import { mergeNflRefStats } from "./lib/merge-ref-stats";
import { applyGameLogTeamStats } from "./lib/rebuild-team-stats-from-logs";
import {
  buildNflverseLineIndex,
  fetchNflverseGamesCsv,
  listNflverseScheduleGames,
  lookupNflLine,
  nflverseMatchupKey,
  type NflverseLineIndex,
} from "./lib/nflverse-lines";
import {
  ingestHistoricalNflverseGames,
  type NflHistoricalGameLogEntry,
} from "./lib/nflverse-historical";
import { homeCoverRate, NflBettingAccumulator } from "./lib/nfl-betting";
import { enrichGameLogsWithPenaltyEvents, compactGameLogPenaltyPayload } from "./lib/attach-penalty-events";
import { attachNflGsniFieldsFromGames } from "../lib/attach-gsni";
import { assertNflIngestValid } from "./lib/validate-ingest";
import { finalizeNflVerifiedArtifacts } from "./lib/write-season-shards";

const NFL_TEAM_ABBRS = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN",
  "DET", "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA",
  "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB",
  "TEN", "WAS",
];

const MIN_SAMPLE = 30;
const LEAGUE_OVER_BASELINE = 46;
const DATA_DIR = path.join(process.cwd(), "data", "nfl");

type NflGameLogEntry = NflHistoricalGameLogEntry;

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

function nflSeasonDates(): string[] {
  const dates: string[] = [];
  const seen = new Set<string>();
  const push = (d: string) => {
    if (seen.has(d)) return;
    seen.add(d);
    dates.push(d);
  };
  for (let startYear = 2016; startYear <= 2025; startYear++) {
    const endYear = startYear + 1;
    for (let month = 9; month <= 12; month++) {
      const days = new Date(startYear, month, 0).getDate();
      for (let day = 1; day <= days; day++) {
        push(
          `${startYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        );
      }
    }
    for (let month = 1; month <= 2; month++) {
      const days = new Date(endYear, month, 0).getDate();
      for (let day = 1; day <= days; day++) {
        push(
          `${endYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        );
      }
    }
  }
  return dates;
}

function writeGameLogsCheckpoint(
  existingById: Map<string, NflGameLogEntry>,
  label: string,
): void {
  const merged = [...existingById.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "game-logs.json"),
    `${JSON.stringify(
      {
        lastUpdated: new Date().toISOString(),
        league: "NFL",
        source: "espn",
        games: merged,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`  …${label}: ${merged.length} games in game-logs.json`);
}

function buildLogEntryFromSummary(
  summary: NonNullable<Awaited<ReturnType<typeof fetchEspnSummary>>>,
  roster: Map<string, number>,
  lineIndex: NflverseLineIndex | null,
  nflverseReferee?: string,
): NflGameLogEntry | null {
  const homeTeam = summary.homeAbbr;
  const awayTeam = summary.awayAbbr;
  if (!NFL_TEAM_ABBRS.includes(homeTeam) || !NFL_TEAM_ABBRS.includes(awayTeam)) {
    return null;
  }

  const totalPoints = summary.homeScore + summary.awayScore;
  const totalFouls = summary.homeFlags + summary.awayFlags;
  const season = inferNflSeason(summary.date);
  let crew =
    summary.officials.length > 0
      ? toRefOfficials(summary.officials, roster)
      : [];
  if (crew.length === 0 && nflverseReferee) {
    const head = canonicalizeOfficialName(nflverseReferee, roster);
    crew = [{ name: head.name, number: head.number, role: "referee" }];
  }
  if (crew.length === 0) return null;

  const closingLine = lineIndex
    ? lookupNflLine(lineIndex, {
        gameId: summary.gameId,
        date: summary.date,
        awayTeam,
        homeTeam,
      })
    : undefined;

  return {
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
    closingTotal: closingLine?.total ?? LEAGUE_OVER_BASELINE,
    homeSpread: closingLine?.homeSpread ?? 0,
    lineSource: closingLine ? "external" : "synthetic",
    officials: crew,
  };
}

async function fillMissingNflverseGames(
  existingById: Map<string, NflGameLogEntry>,
  lineIndex: NflverseLineIndex | null,
  roster: Map<string, number>,
): Promise<number> {
  const cachePath = path.join(DATA_DIR, "nflverse-games.csv");
  if (!fs.existsSync(cachePath)) {
    console.warn("NFL gap-fill skipped: nflverse-games.csv missing");
    return 0;
  }

  const csv = fs.readFileSync(cachePath, "utf8");
  const schedule = listNflverseScheduleGames(csv, {
    minSeason: 2016,
    maxSeason: 2025,
  });
  const haveId = new Set([...existingById.keys()].map(String));
  const haveMatchup = new Set(
    [...existingById.values()].map((g) =>
      nflverseMatchupKey(g.date, g.awayTeam, g.homeTeam),
    ),
  );

  const targets = schedule.filter(
    (game) => game.espnId && !haveId.has(String(game.espnId)),
  );
  console.log(
    `NFL gap-fill: ${targets.length} nflverse games missing from logs`,
  );

  let filled = 0;
  let noEspnId = 0;
  let noOfficials = 0;
  let nflverseRefFallback = 0;

  for (const target of targets) {
    if (!target.espnId) {
      noEspnId++;
      continue;
    }

    await sleep(80);
    let summary;
    try {
      summary = await fetchEspnSummary(target.espnId);
    } catch (err) {
      console.warn(`Gap summary ${target.espnId}: ${err}`);
      continue;
    }
    if (!summary || summary.status !== "STATUS_FINAL") continue;

    const nflverseRef =
      summary.officials.length === 0 ? target.referee : undefined;
    if (summary.officials.length === 0 && !nflverseRef) {
      noOfficials++;
      continue;
    }

    const logEntry = buildLogEntryFromSummary(
      summary,
      roster,
      lineIndex,
      nflverseRef,
    );
    if (!logEntry) continue;

    if (nflverseRef) nflverseRefFallback++;

    existingById.set(String(logEntry.gameId), logEntry);
    haveId.add(String(logEntry.gameId));
    haveMatchup.add(
      nflverseMatchupKey(logEntry.date, logEntry.awayTeam, logEntry.homeTeam),
    );
    filled++;

    if (filled % 50 === 0) {
      writeGameLogsCheckpoint(existingById, `gap-fill +${filled}`);
    }
  }

  console.log(
    `Gap-fill done: +${filled} games (${noEspnId} without ESPN id, ${noOfficials} without officials, ${nflverseRefFallback} via nflverse referee)`,
  );
  return filled;
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

async function loadNflverseLines(dataDir: string): Promise<NflverseLineIndex | null> {
  const cachePath = path.join(dataDir, "nflverse-games.csv");
  try {
    if (fs.existsSync(cachePath)) {
      return buildNflverseLineIndex(fs.readFileSync(cachePath, "utf8"), 2016);
    }
  } catch {
    /* refetch below */
  }
  try {
    console.log("Fetching nflverse closing lines...");
    const csv = await fetchNflverseGamesCsv();
    fs.writeFileSync(cachePath, csv);
    return buildNflverseLineIndex(csv, 2016);
  } catch (err) {
    console.warn(`nflverse lines unavailable: ${err}`);
    return null;
  }
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

async function buildFromEspn(
  seed: RefStatsFile,
  options: { gapFillOnly?: boolean; fromLogsOnly?: boolean; skipHistorical?: boolean } = {},
): Promise<RefStatsFile | null> {
  const roster = loadOfficialRoster(seed);
  const lineIndex = await loadNflverseLines(DATA_DIR);
  const dates = nflSeasonDates();
  console.log(`Scanning ${dates.length} NFL season dates (2016-17 through 2025-26)...`);

  const existingLogs = loadGameLogs("NFL");
  const existingById = new Map(
    (existingLogs?.games ?? []).map((g) => [String(g.gameId), g as unknown as NflGameLogEntry]),
  );
  if (existingById.size > 0) {
    console.log(`Resuming: ${existingById.size} games already in game-logs.json`);
  }

  const refGames = new Map<string, RefGameRecord[]>();
  const refMeta = new Map<string, { name: string; number: number; role: RefRole }>();
  const refMinorGames = new Map<string, RefGameRecord[]>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const refBetting = new Map<string, NflBettingAccumulator>();
  const teamByCrew = new Map<string, Map<string, { crewNames: string[]; games: TeamGameRow[] }>>();
  const exportedGameLogs: NflGameLogEntry[] = [];
  const allDates: string[] = [];
  let processed = 0;
  let linedGames = 0;
  let skippedCached = 0;

  for (const abbr of NFL_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }

  if (!options.gapFillOnly && !options.fromLogsOnly) {
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

      if (existingById.has(String(event.id))) {
        skippedCached++;
        continue;
      }

      await sleep(80);
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
      const closingLine = lineIndex
        ? lookupNflLine(lineIndex, {
            gameId: summary.gameId,
            date: summary.date,
            awayTeam,
            homeTeam,
          })
        : undefined;
      const closingTotal = closingLine?.total ?? LEAGUE_OVER_BASELINE;
      const homeSpread = closingLine?.homeSpread ?? 0;
      const lineSource = closingLine ? ("external" as const) : ("synthetic" as const);
      if (closingLine) linedGames++;
      const overHit = totalPoints > closingTotal;

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
        closingTotal,
        homeSpread,
      };

      allDates.push(summary.date);
      const logEntry: NflGameLogEntry = {
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
        closingTotal,
        homeSpread,
        lineSource,
        officials: crew,
      };
      exportedGameLogs.push(logEntry);
      existingById.set(String(summary.gameId), logEntry);

      if (processed > 0 && processed % 50 === 0) {
        const merged = [...existingById.values()].sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
        );
        fs.writeFileSync(
          path.join(DATA_DIR, "game-logs.json"),
          `${JSON.stringify(
            {
              lastUpdated: new Date().toISOString(),
              league: "NFL",
              source: "espn",
              games: merged,
            },
            null,
            2,
          )}\n`,
        );
        console.log(
          `  …${processed} new / ${merged.length} total (cached skips ${skippedCached})`,
        );
      }

      const key = crewKey(crew);
      const crewNames = crew.map((o) => o.name);

      const makeRow = (teamAbbr: string): TeamGameRow | null => {
        const isHome = homeTeam === teamAbbr;
        const isAway = awayTeam === teamAbbr;
        if (!isHome && !isAway) return null;
        const isTie = summary.homeScore === summary.awayScore;
        const teamWin = isTie
          ? false
          : isHome
            ? summary.homeScore > summary.awayScore
            : summary.awayScore > summary.homeScore;
        return {
          totalPoints,
          totalFouls,
          overHit,
          teamFouls: isHome ? summary.homeFlags : summary.awayFlags,
          opponentFouls: isHome ? summary.awayFlags : summary.homeFlags,
          teamWin,
          teamTie: isTie,
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

        if (closingLine) {
          const acc = refBetting.get(slug) ?? new NflBettingAccumulator(true);
          acc.addGame({
            homeScore: summary.homeScore,
            awayScore: summary.awayScore,
            homeSpread: closingLine.homeSpread,
            total: closingLine.total,
          });
          refBetting.set(slug, acc);
        }

        if (official.role === "referee") {
          const refOnly = refMinorGames.get(slug) ?? [];
          refOnly.push(record);
          refMinorGames.set(slug, refOnly);
        }

        for (const teamAbbr of [homeTeam, awayTeam]) {
          const row = makeRow(teamAbbr);
          if (!row) continue;
          pushRefTeamGame(refTeamBuckets, slug, teamAbbr, {
            gameId: String(summary.gameId),
            foulDifferential: row.teamFouls - row.opponentFouls,
            totalPoints: row.totalPoints,
            overHit: row.overHit,
            teamWin: row.teamWin,
          });
        }
      }

      processed++;
      if (processed % 100 === 0) {
        console.log(
          `  …${processed} new NFL games (${linedGames} with nflverse lines, ${skippedCached} cached)`,
        );
      }
    }
    await sleep(100);
  }
  } else if (options.fromLogsOnly) {
    console.log("Skipping ESPN date scan (--from-logs-only)");
  } else {
    console.log("Skipping date scan (--gap-fill-only); filling nflverse gaps only");
  }

  if (!options.gapFillOnly && !options.fromLogsOnly) {
    await fillMissingNflverseGames(existingById, lineIndex, roster);
  }

  if (!options.skipHistorical) {
    await ingestHistoricalNflverseGames(existingById, roster, DATA_DIR, {
      minSeason: 2000,
      maxSeason: 2015,
    });
  }

  // Merge cached + newly fetched logs, then rebuild aggregates from the full set.
  let mergedLogs = [...existingById.values()]
    .map((g) => ({ ...g, season: inferNflSeason(g.date) }))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
    );

  console.log(
    `Fetch pass done: +${processed} new, ${skippedCached} cached skips, ${mergedLogs.length} unique total`,
  );

  const enriched = enrichGameLogsWithPenaltyEvents(mergedLogs, DATA_DIR);
  const logsForGsni = enriched.games;
  mergedLogs = compactGameLogPenaltyPayload(enriched.games);
  if (enriched.applied > 0) {
    console.log(
      `Attached play-level penalty events to ${enriched.applied}/${mergedLogs.length} games`,
    );
  }

  if (mergedLogs.length < 500) {
    console.warn(`Only ${mergedLogs.length} ESPN games — keeping seed fallback.`);
    return null;
  }

  refGames.clear();
  refMeta.clear();
  refMinorGames.clear();
  refTeamBuckets.clear();
  refBetting.clear();
  for (const abbr of NFL_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }
  allDates.length = 0;
  linedGames = 0;

  for (const game of mergedLogs) {
    allDates.push(game.date);
    if (game.lineSource === "external") linedGames++;
    const overHit = game.totalPoints > game.closingTotal;
    const record: RefGameRecord = {
      gameId: game.gameId,
      date: game.date,
      season: game.season,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      totalPoints: game.totalPoints,
      totalFouls: game.totalFouls,
      homeFlags: game.homeFlags,
      awayFlags: game.awayFlags,
      homePenaltyYards: game.homePenaltyYards,
      awayPenaltyYards: game.awayPenaltyYards,
      totalPenaltyYards: game.homePenaltyYards + game.awayPenaltyYards,
      overHit,
      raptorsInvolved: false,
      closingTotal: game.closingTotal,
      homeSpread: game.homeSpread,
      highLeverageImpact: game.highLeverageImpact,
      highLeverageFlagRate: game.highLeverageFlagRate,
      subjectiveFlags: game.subjectiveFlags,
      administrativeFlags: game.administrativeFlags,
    };
    const key = crewKey(game.officials);
    const crewNames = game.officials.map((o) => o.name);
    const makeRow = (teamAbbr: string): TeamGameRow | null => {
      const isHome = game.homeTeam === teamAbbr;
      const isAway = game.awayTeam === teamAbbr;
      if (!isHome && !isAway) return null;
      return {
        totalPoints: game.totalPoints,
        totalFouls: game.totalFouls,
        overHit,
        teamFouls: isHome ? game.homeFlags : game.awayFlags,
        opponentFouls: isHome ? game.awayFlags : game.homeFlags,
        teamWin: isHome
          ? game.homeScore > game.awayScore
          : game.awayScore > game.homeScore,
        isHome,
      };
    };
    for (const teamAbbr of [game.homeTeam, game.awayTeam]) {
      const row = makeRow(teamAbbr);
      if (!row) continue;
      const buckets = teamByCrew.get(teamAbbr)!;
      const existing = buckets.get(key) ?? { crewNames, games: [] };
      existing.games.push(row);
      buckets.set(key, existing);
    }
    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      refMeta.set(slug, official);
      const games = refGames.get(slug) ?? [];
      games.push(record);
      refGames.set(slug, games);
      if (game.lineSource === "external") {
        const acc = refBetting.get(slug) ?? new NflBettingAccumulator(true);
        acc.addGame({
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          homeSpread: game.homeSpread,
          total: game.closingTotal,
        });
        refBetting.set(slug, acc);
      }
      if (official.role === "referee") {
        const refOnly = refMinorGames.get(slug) ?? [];
        refOnly.push(record);
        refMinorGames.set(slug, refOnly);
      }
      for (const teamAbbr of [game.homeTeam, game.awayTeam]) {
        const row = makeRow(teamAbbr);
        if (!row) continue;
        pushRefTeamGame(refTeamBuckets, slug, teamAbbr, {
          gameId: String(game.gameId),
          foulDifferential: row.teamFouls - row.opponentFouls,
          totalPoints: row.totalPoints,
          overHit: row.overHit,
          teamWin: row.teamWin,
        });
      }
    }
  }

  const processedTotal = mergedLogs.length;
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
    const betting = refBetting.get(slug)?.finalize();
    const nflAnalytics = buildNflRefAnalyticsForOfficial(
      refOnly,
      games,
      leagueAvgFlags,
      leagueAvgPenaltyYards,
    );

    refs.push({
      slug,
      name: meta.name,
      number: meta.number,
      games: games.length,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate: betting ? homeCoverRate(betting) : null,
      totalPointsDelta: round1(avgTotal - leagueAvgTotal),
      foulsDelta: round1(avgFouls - leagueAvgFouls),
      seasons: [...new Set(games.map((g) => g.season))],
      recentGames: games.slice(-8).reverse(),
      teamStats: collectRefTeamStats(refTeamBuckets.get(slug) ?? new Map()),
      bettingStats: betting,
      nflAnalytics,
    });
  }
  refs.sort((a, b) => b.games - a.games);
  dedupeRefsInPlace(refs, leagueAvgTotal, leagueAvgFouls);
  const refsWithGsni = attachNflGsniFieldsFromGames(refs, logsForGsni);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const abbr of NFL_TEAM_ABBRS) {
    teamSplits[abbr] = [...teamByCrew.get(abbr)!.entries()]
      .map(([key, data]) =>
        buildTeamSplit(key, data.crewNames, data.games, leagueAvgTotal),
      )
      .sort((a, b) => b.games - a.games);
  }

  const logsForDisk = mergedLogs.map(({ penaltyEvents: _pe, ...game }) => game);

  fs.writeFileSync(
    path.join(DATA_DIR, "game-logs.json"),
    `${JSON.stringify(
      {
        lastUpdated: new Date().toISOString(),
        league: "NFL",
        source: "espn",
        games: logsForDisk,
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
      `NFL ESPN build: ${processedTotal} games`,
      mergedLogs,
    ),
  );

  const refsWithBetting = refs.filter((r) => r.bettingStats?.linesAvailable).length;
  const atsAvailable = linedGames >= 50 && refsWithBetting >= 3;

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: [...new Set(refs.flatMap((r) => r.seasons))].sort(),
      leagueAvgTotal: round1(leagueAvgTotal),
      leagueAvgFouls: round1(leagueAvgFouls),
      leagueOverBaseline: LEAGUE_OVER_BASELINE,
      leagueAvgPenaltyYards,
      minSampleSize: MIN_SAMPLE,
      source: "hybrid",
      data_verified: true,
      data_source: "ESPN + nflverse (2000-present)",
      atsAvailable,
      refCount: refsWithGsni.length,
      totalGamesProcessed: processedTotal,
      dateRange: {
        earliest: allDates[0],
        latest: allDates[allDates.length - 1],
      },
      note: atsAvailable
        ? `Scores, penalties, and crews from ESPN (2016+) plus nflverse history (2000–2015). ATS/O-U from nflverse closing lines (${linedGames}/${processedTotal} games matched).`
        : "Scores, penalties, and crews from ESPN (2016+) plus nflverse history (2000–2015). Ref×team W-L from stored game logs.",
    },
    refs: refsWithGsni,
    teamSplits,
  };
}

async function main() {
  const statsPath = path.join(DATA_DIR, "ref-stats.json");
  const seedPath = path.join(DATA_DIR, "ref-stats.seed.json");
  const replaceOnly = !process.argv.includes("--merge-seed");

  console.log("=== Ref Watch NFL data build (ESPN) ===\n");

  let base: RefStatsFile;
  try {
    base = JSON.parse(fs.readFileSync(seedPath, "utf8")) as RefStatsFile;
  } catch {
    try {
      base = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;
    } catch {
      console.error("No NFL seed found. Run npm run generate-nfl-seed -- --regenerate first.");
      process.exit(1);
    }
  }

  const built = await buildFromEspn(base, {
    gapFillOnly: process.argv.includes("--gap-fill-only"),
    fromLogsOnly: process.argv.includes("--from-logs-only"),
    skipHistorical: process.argv.includes("--skip-historical"),
  });
  if (built) {
    let output = replaceOnly ? built : mergeNflRefStats(base, built);
    const logs = loadGameLogs("NFL");
    if (logs && logs.games.length > 0) {
      const rebuilt = applyGameLogTeamStats(output, logs);
      output = rebuilt.stats;
      console.log(
        `Rebuilt ref×team W-L from ${rebuilt.gameCount} game logs → ` +
          `${rebuilt.qualifiedPairs}/${rebuilt.teamStatsPairs} qualified matrix pairs`,
      );
    }
    fs.writeFileSync(statsPath, `${JSON.stringify(output, null, 2)}\n`);
    console.log(
      `${replaceOnly ? "Built" : "Merged"} ${built.meta.totalGamesProcessed} ESPN games → ` +
        `${output.refs.length} officials (${output.meta.source})`,
    );
    const qualified = output.refs.reduce(
      (sum, ref) =>
        sum +
        Object.values(ref.teamStats ?? {}).filter((stat) => stat.games >= 3).length,
      0,
    );
    const pairs = output.refs.reduce(
      (sum, ref) => sum + Object.keys(ref.teamStats ?? {}).length,
      0,
    );
    console.log(`Matrix coverage: ${qualified}/${pairs} ref×team pairs with 3+ games`);

    const logsForShards = loadGameLogs("NFL");
    if (logsForShards?.games.length) {
      console.log("\n--- Finalizing verified ingest artifacts ---");
      assertNflIngestValid(logsForShards.games, { minGames: 5000 });
      const { shards } = finalizeNflVerifiedArtifacts(logsForShards.games, process.cwd(), {
        dataSource: output.meta.data_source,
        note: output.meta.note,
      });
      console.log(
        `Wrote ${shards.shardCount} season shards (${shards.gameCount} games) → data/nfl/game-logs/`,
      );
    }
  } else {
    const honest: RefStatsFile = {
      ...base,
      meta: {
        ...base.meta,
        source: "seeded",
        atsAvailable: false,
        lastUpdated: new Date().toISOString(),
        note:
          "Simulated preview data with full ref×team matrix, not verified against official NFL records. " +
          "Run build-nfl-data when ESPN backfill succeeds to merge verified penalty splits.",
      },
    };
    fs.writeFileSync(statsPath, `${JSON.stringify(honest, null, 2)}\n`);
    console.log("ESPN backfill insufficient — kept seed baseline.");
  }

  console.log("\n--- Regenerating overview insights ---");
  const { runPostIngestInsightGenerator } = await import("../lib/post-ingest-insights");
  runPostIngestInsightGenerator();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
