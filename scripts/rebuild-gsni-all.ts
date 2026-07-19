#!/usr/bin/env npx tsx
/**
 * Attach GSNI fields to ref profiles for every league with game-log support.
 *
 * Usage: npm run rebuild-gsni:all
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { attachGsniFieldsFromGames } from "./lib/attach-gsni";
import { loadGameLogs } from "./lib/game-logs";
import type { InsightsLeagueId } from "../src/lib/league-manifest";
import { gsniResearchConfigForLeague } from "../src/lib/gsni-research";

const ROOT = process.cwd();
const GSNI_LEAGUES: InsightsLeagueId[] = ["nfl", "nba", "nhl"];

function dataLeagueForManifest(leagueId: InsightsLeagueId): string {
  return leagueId.toUpperCase();
}

function rebuildLeagueGsni(leagueId: InsightsLeagueId): void {
  const config = gsniResearchConfigForLeague(leagueId);
  if (!config) {
    console.log(`skip ${leagueId}: no GSNI config`);
    return;
  }

  const statsPath = path.join(ROOT, "data", leagueId, "ref-stats.json");
  if (!fs.existsSync(statsPath)) {
    console.log(`skip ${leagueId}: missing ${statsPath}`);
    return;
  }

  const games = loadGameLogs(dataLeagueForManifest(leagueId) as "NBA" | "NFL" | "NHL");
  if (!games?.games?.length) {
    console.log(`skip ${leagueId}: no game logs`);
    return;
  }

  const raw = JSON.parse(fs.readFileSync(statsPath, "utf8")) as {
    refs: import("../src/lib/types").RefProfile[];
    [key: string]: unknown;
  };

  const updated = attachGsniFieldsFromGames(raw.refs, games.games, undefined, {
    minHighLeverageMinutes: config.minHighLeverageMinutes,
  });

  const withGsni = updated.filter((ref) => ref.referee_gsni !== undefined).length;
  fs.writeFileSync(
    statsPath,
    `${JSON.stringify({ ...raw, refs: updated })}\n`,
  );
  console.log(`${leagueId}: attached GSNI to ${withGsni}/${updated.length} refs`);
}

function main(): void {
  for (const leagueId of GSNI_LEAGUES) {
    rebuildLeagueGsni(leagueId);
  }
}

main();
