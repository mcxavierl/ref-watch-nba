#!/usr/bin/env npx tsx
/**
 * Rebuild NBA ref-stats from verified game logs using DISTINCT game_id counts.
 * Updates data/ref-stats.json and data/ref-stats-core.json.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { applyBbrRefTeamStats } from "./lib/apply-bbr-ref-team-stats";
import { loadBbrRefTeamRecords } from "./lib/bbr-ref-team-records";
import type { GameLogFile } from "./lib/game-logs";
import { dedupeRefsInPlace } from "./lib/merge-duplicate-refs";
import { splitRefStatsForDeploy } from "./lib/split-ref-stats";
import { refSlug } from "./lib/slug";
import {
  canonicalRefKey,
  chooseRefIdentity,
  displayNameForKey,
  type RefVariant,
} from "./lib/ref-identity";
import {
  collectRefTeamStats,
  pushRefTeamGame,
} from "./lib/ref-team-stats";
import { teamWonGame } from "./lib/team-win";
import { dedupeByGameId } from "../src/lib/game-count";
import type {
  RefGameRecord,
  RefProfile,
  RefStatsFile,
} from "./lib/types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function loadNbaGameLogs(root: string): GameLogFile | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(root, "data/game-logs.json"), "utf8"),
    ) as GameLogFile;
  } catch {
    return null;
  }
}

export function rebuildNbaRefStatsFromLogs(
  existing: RefStatsFile,
  root: string,
): RefStatsFile {
  const logs = loadNbaGameLogs(root);
  if (!logs?.games.length) {
    throw new Error(`No NBA game logs found at ${path.join(root, "data/game-logs.json")}`);
  }

  const refGames = new Map<string, RefGameRecord[]>();
  const refIdentities = new Map<string, Map<number, RefVariant>>();
  const refTeamBuckets = new Map<
    string,
    Map<string, import("./lib/ref-team-stats").RefTeamGameRow[]>
  >();

  for (const game of logs.games) {
    const overHit = game.totalPoints > game.closingTotal;
    const record: RefGameRecord = {
      gameId: game.gameId,
      date: game.date,
      season: game.season,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      totalPoints: game.totalPoints,
      totalFouls: game.totalFouls,
      overHit,
      raptorsInvolved:
        game.homeTeam === "TOR" || game.awayTeam === "TOR",
      closingTotal: game.closingTotal,
      homeSpread: game.homeSpread,
    };

    for (const official of game.officials) {
      const refKey = canonicalRefKey(official.name);
      const variants = refIdentities.get(refKey) ?? new Map<number, RefVariant>();
      const variant =
        variants.get(official.number) ??
        { name: official.name, number: official.number, games: 0, lastDate: "" };
      variant.games += 1;
      if (game.date >= variant.lastDate) {
        variant.lastDate = game.date;
        variant.name = official.name;
      }
      variants.set(official.number, variant);
      refIdentities.set(refKey, variants);

      const list = refGames.get(refKey) ?? [];
      list.push(record);
      refGames.set(refKey, list);

      for (const teamAbbr of [game.homeTeam, game.awayTeam]) {
        const isHome = game.homeTeam === teamAbbr;
        const teamWin = teamWonGame(
          game.homeScore,
          game.awayScore,
          game.homeTeam,
          game.awayTeam,
          teamAbbr,
        );
        const teamFouls = isHome
          ? (game.homeFouls ?? game.homeFlags ?? 0)
          : (game.awayFouls ?? game.awayFlags ?? 0);
        const opponentFouls = isHome
          ? (game.awayFouls ?? game.awayFlags ?? 0)
          : (game.homeFouls ?? game.homeFlags ?? 0);

        pushRefTeamGame(refTeamBuckets, refKey, teamAbbr, {
          foulDifferential: teamFouls - opponentFouls,
          totalPoints: game.totalPoints,
          overHit,
          teamWin,
        });
      }
    }
  }

  const allRecords = dedupeByGameId([...refGames.values()].flat());
  const leagueAvgTotal =
    allRecords.reduce((s, g) => s + g.totalPoints, 0) / allRecords.length;
  const leagueAvgFouls =
    allRecords.reduce((s, g) => s + g.totalFouls, 0) / allRecords.length;
  const leagueOverBaseline = leagueAvgTotal;

  const preservedBySlug = new Map(existing.refs.map((r) => [r.slug, r]));
  const refs: RefProfile[] = [];

  for (const [refKey, gamesRaw] of refGames) {
    const games = dedupeByGameId(gamesRaw);
    if (games.length === 0) continue;

    const identity = chooseRefIdentity(refIdentities.get(refKey)!.values());
    const name = displayNameForKey(refKey, identity.name);
    const slug = refSlug(name, identity.number);
    const avgTotal =
      games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
    const overRate = games.filter((g) => g.overHit).length / games.length;
    const avgFouls =
      games.reduce((s, g) => s + g.totalFouls, 0) / games.length;
    const preserved = preservedBySlug.get(slug);

    refs.push({
      slug,
      name,
      number: identity.number,
      role: preserved?.role,
      birthplace: preserved?.birthplace,
      hometown: preserved?.hometown,
      games: games.length,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate: preserved?.homeCoverRate ?? null,
      totalPointsDelta: round1(avgTotal - leagueAvgTotal),
      foulsDelta: round1(avgFouls - leagueAvgFouls),
      seasons: [...new Set(games.map((g) => g.season))].sort(),
      recentGames: [...games]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8),
      teamStats: collectRefTeamStats(refTeamBuckets.get(refKey) ?? new Map()),
      bettingStats: preserved?.bettingStats,
      marketExpectation: preserved?.marketExpectation,
      provenance: preserved?.provenance,
    });
  }

  refs.sort((a, b) => b.games - a.games);
  dedupeRefsInPlace(refs, leagueAvgTotal, leagueAvgFouls);

  const dates = logs.games.map((g) => g.date).sort();
  const rebuildNote = " Ref game counts rebuilt from DISTINCT game_id in game logs.";
  const existingNote = existing.meta.note ?? "";
  const note = existingNote.includes("Ref game counts rebuilt from DISTINCT game_id")
    ? existingNote
    : existingNote + rebuildNote;
  return {
    ...existing,
    meta: {
      ...existing.meta,
      lastUpdated: new Date().toISOString(),
      leagueAvgTotal: round1(leagueAvgTotal),
      leagueAvgFouls: round1(leagueAvgFouls),
      leagueOverBaseline: round1(leagueOverBaseline),
      refCount: refs.length,
      totalGamesProcessed: logs.games.length,
      dateRange: {
        earliest: dates[0] ?? existing.meta.dateRange?.earliest ?? "",
        latest: dates.at(-1) ?? existing.meta.dateRange?.latest ?? "",
      },
      note,
    },
    refs,
    teamSplits: existing.teamSplits,
  };
}

export interface SyncNbaRefStatsResult {
  refCount: number;
  totalGamesProcessed: number;
  sampleSlug: string;
  sampleGamesBefore: number;
  sampleGamesAfter: number;
}

export function syncNbaRefStatsFromLogs(root?: string): SyncNbaRefStatsResult {
  const r = root ?? process.cwd();
  const dataDir = path.join(r, "data");
  const statsPath = path.join(dataDir, "ref-stats.json");
  const existing = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;

  const sampleSlug = "nick-buchert-3";
  const before = existing.refs.find((ref) => ref.slug === sampleSlug)?.games ?? 0;
  let stats = rebuildNbaRefStatsFromLogs(existing, r);

  const bbrFixture = loadBbrRefTeamRecords(
    path.join(r, "data", "bbr-ref-team-records.json"),
  );
  if (bbrFixture) {
    stats = applyBbrRefTeamStats(stats, bbrFixture).stats;
  }

  fs.writeFileSync(statsPath, `${JSON.stringify(stats, null, 2)}\n`);

  const { core, teamSplits } = splitRefStatsForDeploy(stats);
  fs.writeFileSync(
    path.join(dataDir, "ref-stats-core.json"),
    `${JSON.stringify(core)}\n`,
  );
  fs.writeFileSync(
    path.join(dataDir, "team-splits.json"),
    `${JSON.stringify(teamSplits)}\n`,
  );

  const after = stats.refs.find((ref) => ref.slug === sampleSlug)?.games ?? 0;
  return {
    refCount: stats.refs.length,
    totalGamesProcessed: stats.meta.totalGamesProcessed ?? 0,
    sampleSlug,
    sampleGamesBefore: before,
    sampleGamesAfter: after,
  };
}

function main(): void {
  const result = syncNbaRefStatsFromLogs();
  console.log(
    `Rebuilt NBA ref stats: ${result.refCount} refs (${result.sampleGamesBefore} → ${result.sampleGamesAfter} games for Buchert)`,
  );
}

if (import.meta.url.startsWith("file:")) {
  const executed = path.resolve(process.argv[1] ?? "");
  const modulePath = path.resolve(new URL(import.meta.url).pathname);
  if (executed === modulePath) {
    main();
  }
}
