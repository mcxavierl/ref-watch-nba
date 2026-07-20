#!/usr/bin/env npx tsx
/**
 * Attach ESPN gameInfo.officials to WNBA game logs missing crew assignments.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { RefOfficial } from "../../src/lib/types";
import { dedupeGameLogs, loadGameLogs, saveGameLogs, type GameLogEntry } from "../lib/game-logs";
import { parseRefFromCell } from "../lib/slug";
import {
  fetchWnbaSummaryOfficials,
  normalizeOfficialName,
  sleep,
  toWnbaOfficials,
} from "./lib/espn";

const ASSIGNMENTS_PATH = path.join(process.cwd(), "data", "wnba", "assignments.json");

export function loadWnbaOfficialRoster(): Map<string, number> {
  const roster = new Map<string, number>();

  try {
    const assignments = JSON.parse(fs.readFileSync(ASSIGNMENTS_PATH, "utf8")) as {
      games?: { crew?: RefOfficial[] }[];
    };
    for (const game of assignments.games ?? []) {
      for (const official of game.crew ?? []) {
        if (official.number > 0) {
          roster.set(normalizeOfficialName(official.name), official.number);
        } else {
          const parsed = parseRefFromCell(official.name);
          if (parsed.number > 0) {
            roster.set(normalizeOfficialName(parsed.name), parsed.number);
          }
        }
      }
    }
  } catch {
    // assignments file optional
  }

  return roster;
}

export async function enrichWnbaGameLogOfficials(
  games: GameLogEntry[],
  options?: { sleepMs?: number },
): Promise<{ games: GameLogEntry[]; enriched: number; skipped: number }> {
  const roster = loadWnbaOfficialRoster();
  const sleepMs = options?.sleepMs ?? 40;
  let enriched = 0;
  let skipped = 0;

  const nextGames: GameLogEntry[] = [];
  for (const game of games) {
    if (game.officials?.length) {
      nextGames.push(game);
      skipped += 1;
      continue;
    }

    await sleep(sleepMs);
    const officials = await fetchWnbaSummaryOfficials(game.gameId);
    if (officials.length === 0) {
      nextGames.push(game);
      continue;
    }

    const mapped = toWnbaOfficials(officials, roster);
    if (mapped.length === 0) {
      nextGames.push(game);
      continue;
    }

    nextGames.push({
      ...game,
      officials: mapped,
    });
    enriched += 1;

    if (enriched % 50 === 0) {
      console.log(`  enriched ${enriched}/${games.length - skipped} games...`);
    }
  }

  return { games: dedupeGameLogs(nextGames), enriched, skipped };
}

async function main(): Promise<void> {
  const existing = loadGameLogs("WNBA");
  if (!existing?.games?.length) {
    console.error("No WNBA game logs found at data/wnba/game-logs.json");
    process.exit(1);
  }

  const missing = existing.games.filter((game) => !game.officials?.length).length;
  console.log(`Enriching WNBA officials for ${missing}/${existing.games.length} games...`);

  const result = await enrichWnbaGameLogOfficials(existing.games);
  saveGameLogs({
    ...existing,
    lastUpdated: new Date().toISOString(),
    games: result.games,
  });

  const withOfficials = result.games.filter((game) => game.officials?.length).length;
  console.log(
    `Done. enriched=${result.enriched}, already_had_officials=${result.skipped}, ` +
      `coverage=${withOfficials}/${result.games.length}`,
  );
}

if (import.meta.url.startsWith("file:")) {
  const executed = path.resolve(process.argv[1] ?? "");
  const modulePath = path.resolve(new URL(import.meta.url).pathname);
  if (executed === modulePath) {
    main().catch((err) => {
      console.error(err);
      process.exit(1);
    });
  }
}
