#!/usr/bin/env npx tsx
/**
 * Merge verified NBA officials from Basketball-Reference box scores into
 * data/game-logs.json without dropping games or touching ref-stats.json.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fetchBbrHtml, fetchBbrHtmlOptional } from "../ingest/fetch-bbr";
import {
  BBR_SCHEDULE_MONTHS,
  bbrScheduleUrl,
  bbrScheduleMonthUrl,
  GAME_LOGS_DIR,
  INGEST_SEASONS,
  MANIFEST_PATH,
} from "../ingest/config";
import { parseBbrSchedule } from "../ingest/parse-schedule";
import {
  buildRefIndexMap,
  mergeOfficialIntoIndex,
  NBA_REF_NUMBERS,
  parseBbrBoxScoreOfficials,
  parseBbrRefIndex,
} from "../ingest/parse-ref-index";
import { normalizeRefName } from "../../src/lib/bbr-ref-team-records";
import {
  dedupeGameLogs,
  loadGameLogs,
  saveGameLogs,
  toOfficials,
  type GameLogEntry,
} from "../lib/game-logs";
import { BBR_REF_INDEX_URL } from "../ingest/config";

const LEAGUE_AVG_TOTAL = 225;
const LEAGUE_AVG_FOULS = 38.5;

function matchKey(date: string, home: string, away: string): string {
  return `${date}|${home}|${away}`;
}

function inferSeason(date: string): string {
  const year = Number.parseInt(date.slice(0, 4), 10);
  const month = Number.parseInt(date.slice(5, 7), 10);
  const start = month >= 10 ? year : year - 1;
  const end = String(start + 1).slice(-2);
  return `${start}-${end}`;
}

function officialNumber(name: string, refIndex: Map<string, { number: number }>): number {
  return (
    NBA_REF_NUMBERS[name] ??
    refIndex.get(normalizeRefName(name))?.number ??
    0
  );
}

async function loadBbrSchedules(
  seasons: readonly string[] = INGEST_SEASONS,
): Promise<ReturnType<typeof parseBbrSchedule>> {
  const all: ReturnType<typeof parseBbrSchedule> = [];
  for (const season of seasons) {
    let sched: ReturnType<typeof parseBbrSchedule> = [];
    for (const month of BBR_SCHEDULE_MONTHS) {
      const html = await fetchBbrHtmlOptional(
        bbrScheduleMonthUrl(season, month),
        `schedule_${season}_${month}`,
      );
      if (!html) continue;
      sched.push(...parseBbrSchedule(html, season));
    }
    const mainHtml = await fetchBbrHtml(bbrScheduleUrl(season), `schedule_${season}`);
    sched.push(...parseBbrSchedule(mainHtml, season));

    const seen = new Set<string>();
    sched = sched.filter((g) => {
      const key = matchKey(g.date, g.homeTeam, g.awayTeam);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    all.push(...sched);
    console.log(`  ${season}: ${sched.length} BBR schedule rows`);
  }
  return all;
}

async function fetchBoxOfficials(
  boxScoreUrl: string,
  cacheKey: string,
): Promise<string[]> {
  if (!boxScoreUrl) return [];
  const slug = boxScoreUrl.split("/").pop()?.replace(".html", "") ?? cacheKey;
  try {
    const html = await fetchBbrHtmlOptional(boxScoreUrl, `boxscore_${slug}`);
    if (!html) return [];
    return parseBbrBoxScoreOfficials(html);
  } catch {
    return [];
  }
}

function findLogGameForBbr(
  gamesByKey: Map<string, GameLogEntry>,
  gamesById: Map<string, GameLogEntry>,
  bbrGame: ReturnType<typeof parseBbrSchedule>[number],
): GameLogEntry | undefined {
  const exact = gamesByKey.get(matchKey(bbrGame.date, bbrGame.homeTeam, bbrGame.awayTeam));
  if (exact) return exact;

  const candidates = [...gamesById.values()].filter(
    (g) =>
      g.season === bbrGame.season &&
      g.homeTeam === bbrGame.homeTeam &&
      g.awayTeam === bbrGame.awayTeam,
  );
  if (candidates.length === 0) return undefined;

  const scoreMatch = candidates.filter(
    (g) =>
      g.homeScore === bbrGame.homeScore && g.awayScore === bbrGame.awayScore,
  );
  if (scoreMatch.length === 1) return scoreMatch[0];

  const dateMatch = candidates.filter((g) => g.date === bbrGame.date);
  if (dateMatch.length === 1) return dateMatch[0];

  if (candidates.length === 1) return candidates[0];

  return undefined;
}

function upsertFromBbr(
  gamesByKey: Map<string, GameLogEntry>,
  gamesById: Map<string, GameLogEntry>,
  bbrGame: ReturnType<typeof parseBbrSchedule>[number],
  officials: string[],
  refIndex: Map<string, { number: number }>,
): "updated" | "added" | "skipped" {
  if (officials.length === 0) return "skipped";

  const key = matchKey(bbrGame.date, bbrGame.homeTeam, bbrGame.awayTeam);
  const crew = toOfficials(
    officials.map((name) => ({
      name,
      number: officialNumber(name, refIndex),
      role: "referee" as const,
    })),
  );

  const existing = findLogGameForBbr(gamesByKey, gamesById, bbrGame);
  if (existing) {
    existing.officials = crew;
    existing.homeScore = bbrGame.homeScore;
    existing.awayScore = bbrGame.awayScore;
    existing.totalPoints = bbrGame.homeScore + bbrGame.awayScore;
    gamesByKey.set(
      matchKey(existing.date, existing.homeTeam, existing.awayTeam),
      existing,
    );
    gamesById.set(existing.gameId, existing);
    return "updated";
  }

  const gameId = `bbr-${bbrGame.bbrGameId || key.replace(/\|/g, "-")}`;
  if (gamesById.has(gameId)) return "skipped";

  const entry: GameLogEntry = {
    gameId,
    date: bbrGame.date,
    season: bbrGame.season || inferSeason(bbrGame.date),
    league: "NBA",
    homeTeam: bbrGame.homeTeam,
    awayTeam: bbrGame.awayTeam,
    homeScore: bbrGame.homeScore,
    awayScore: bbrGame.awayScore,
    totalPoints: bbrGame.homeScore + bbrGame.awayScore,
    totalFouls: LEAGUE_AVG_FOULS,
    closingTotal: LEAGUE_AVG_TOTAL,
    homeSpread: 0,
    lineSource: "synthetic",
    officials: crew,
  };
  gamesByKey.set(key, entry);
  gamesById.set(gameId, entry);
  return "added";
}

function writeNdjsonShards(games: GameLogEntry[]): void {
  fs.mkdirSync(GAME_LOGS_DIR, { recursive: true });
  const bySeason = new Map<string, GameLogEntry[]>();
  for (const game of games) {
    const list = bySeason.get(game.season) ?? [];
    list.push(game);
    bySeason.set(game.season, list);
  }
  for (const season of INGEST_SEASONS) {
    const seasonGames = (bySeason.get(season) ?? []).sort(
      (a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
    );
    const shardPath = path.join(GAME_LOGS_DIR, `${season}.ndjson`);
    fs.writeFileSync(
      shardPath,
      `${seasonGames.map((g) => JSON.stringify(g)).join("\n")}\n`,
    );
    console.log(`  Wrote ${seasonGames.length} → ${shardPath}`);
  }
}

function writeManifest(gameCount: number): void {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  const manifest = {
    data_verified: true,
    data_source: "Basketball-Reference + NBA Stats API",
    last_ingested_at: new Date().toISOString(),
    game_count: gameCount,
    note: "Officials merged from BBR box scores; ref-stats preserved separately.",
  };
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

async function main() {
  const seasonArg = process.argv.find((a) => a.startsWith("--season="));
  const seasonsArg = process.argv.find((a) => a.startsWith("--seasons="));
  const seasonFilter = seasonArg?.split("=")[1];
  const seasonFilters = seasonsArg
    ? seasonsArg.split("=")[1]!.split(",").map((s) => s.trim()).filter(Boolean)
    : seasonFilter
      ? [seasonFilter]
      : null;
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1]!, 10) : 0;
  const teamArg = process.argv.find((a) => a.startsWith("--team="));
  const teamFilter = teamArg?.split("=")[1]?.toUpperCase();

  const existing = loadGameLogs("NBA");
  if (!existing?.games?.length) {
    console.error("Missing data/game-logs.json");
    process.exit(1);
  }

  const beforeCount = existing.games.length;
  console.log(`=== NBA officials sync (BBR) — ${beforeCount} existing games ===\n`);

  const refIndexHtml = await fetchBbrHtml(BBR_REF_INDEX_URL, "ref_index");
  const refIndex = buildRefIndexMap(parseBbrRefIndex(refIndexHtml));

  console.log("Loading BBR schedules...");
  const seasonsToLoad =
    seasonFilters?.length ? seasonFilters : [...INGEST_SEASONS];
  let schedules = await loadBbrSchedules(seasonsToLoad);
  if (seasonFilters?.length) {
    const allowed = new Set(seasonFilters);
    schedules = schedules.filter((g) => allowed.has(g.season));
    console.log(`Filtered to [${seasonFilters.join(", ")}]: ${schedules.length} games`);
  }

  if (teamFilter) {
    schedules = schedules.filter(
      (g) => g.homeTeam === teamFilter || g.awayTeam === teamFilter,
    );
    console.log(`Filtered to team ${teamFilter}: ${schedules.length} games`);
  }

  const gamesByKey = new Map<string, GameLogEntry>();
  const gamesById = new Map<string, GameLogEntry>();
  for (const game of existing.games) {
    gamesByKey.set(matchKey(game.date, game.homeTeam, game.awayTeam), game);
    gamesById.set(game.gameId, game);
  }

  let updated = 0;
  let added = 0;
  let skipped = 0;
  let processed = 0;

  let targets = schedules.filter((g) => g.boxScoreUrl);
  if (limit > 0) targets = targets.slice(0, limit);
  console.log(`Fetching officials for ${targets.length} box scores…`);

  const results = await mapWithConcurrency(targets, 2, async (bbrGame, index) => {
    const officials = await fetchBoxOfficials(
      bbrGame.boxScoreUrl,
      `${bbrGame.date}-${bbrGame.awayTeam}-${bbrGame.homeTeam}`,
    );
    if ((index + 1) % 50 === 0) {
      console.log(`  …${index + 1}/${targets.length} box scores fetched`);
    }
    return { bbrGame, officials };
  });

  for (const { bbrGame, officials } of results) {
    processed++;
    for (const name of officials) {
      mergeOfficialIntoIndex(refIndex, name, officialNumber(name, refIndex));
    }

    const result = upsertFromBbr(gamesByKey, gamesById, bbrGame, officials, refIndex);
    if (result === "updated") updated++;
    else if (result === "added") added++;
    else skipped++;
  }

  const merged = dedupeGameLogs([...gamesById.values()]);
  const afterCount = merged.length;
  if (afterCount < beforeCount) {
    console.error(
      `FATAL: game count dropped ${beforeCount} → ${afterCount} (data loss blocked)`,
    );
    process.exit(1);
  }

  saveGameLogs({
    lastUpdated: new Date().toISOString(),
    league: "NBA",
    source: "Basketball-Reference box scores (officials merge)",
    games: merged,
  });

  writeNdjsonShards(merged);
  writeManifest(merged.length);

  const schwab = merged.filter((g) =>
    g.officials.some((o) => o.name === "Brandon Schwab"),
  );
  const schwabSac = schwab.filter(
    (g) => g.homeTeam === "SAC" || g.awayTeam === "SAC",
  );

  console.log("\n=== SYNC COMPLETE ===");
  console.log(`Games: ${beforeCount} → ${afterCount} (+${afterCount - beforeCount})`);
  console.log(`Officials updated: ${updated}, added games: ${added}, skipped: ${skipped}`);
  console.log(`Brandon Schwab games: ${schwab.length} (${schwabSac.length} involving SAC)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
