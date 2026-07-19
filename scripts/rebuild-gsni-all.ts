#!/usr/bin/env npx tsx
/**
 * Attach GSNI fields to ref profiles for NFL and NBA.
 *
 * Usage: npm run rebuild-gsni:all
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { attachGsniFieldsFromGames } from "./lib/attach-gsni";
import { loadGameLogs } from "./lib/game-logs";
import type { InsightsLeagueId } from "../src/lib/league-manifest";
import { gsniResearchConfigForLeague } from "../src/lib/gsni-research";
import type { RefProfile } from "../src/lib/types";

const ROOT = process.cwd();
const GSNI_LEAGUES: InsightsLeagueId[] = ["nfl", "nba"];

function dataLeagueForManifest(leagueId: InsightsLeagueId): "NBA" | "NFL" {
  return leagueId.toUpperCase() as "NBA" | "NFL";
}

function statsPathForLeague(leagueId: InsightsLeagueId): string {
  if (leagueId === "nba") {
    return path.join(ROOT, "data", "ref-stats.json");
  }
  return path.join(ROOT, "data", leagueId, "ref-stats.json");
}

function corePathForLeague(leagueId: InsightsLeagueId): string | null {
  if (leagueId === "nba") {
    return path.join(ROOT, "data", "ref-stats-core.json");
  }
  return path.join(ROOT, "data", leagueId, "ref-stats-core.json");
}

function preserveGsniFields(
  updated: RefProfile,
  previous: RefProfile | undefined,
): RefProfile {
  if (!previous) return updated;
  if (updated.referee_gsni !== undefined) return updated;
  if (previous.referee_gsni === undefined) return updated;
  return {
    ...updated,
    referee_gsni: previous.referee_gsni,
    referee_gsni_volatility: previous.referee_gsni_volatility,
    gsniHighLeverageMinutes: previous.gsniHighLeverageMinutes,
    gsniSampleGames: previous.gsniSampleGames,
  };
}

function rebuildLeagueGsni(leagueId: InsightsLeagueId): void {
  const config = gsniResearchConfigForLeague(leagueId);
  if (!config) {
    console.log(`skip ${leagueId}: no GSNI config`);
    return;
  }

  const statsPath = statsPathForLeague(leagueId);
  if (!fs.existsSync(statsPath)) {
    console.log(`skip ${leagueId}: missing ${statsPath}`);
    return;
  }

  const games = loadGameLogs(dataLeagueForManifest(leagueId));
  if (!games?.games?.length) {
    console.log(`skip ${leagueId}: no game logs`);
    return;
  }

  const hasPenaltyEvents = games.games.some(
    (game) => (game.penaltyEvents?.length ?? 0) > 0,
  );
  if (leagueId === "nfl" && !hasPenaltyEvents) {
    console.log(
      `${leagueId}: skip GSNI attach (no penalty events in game logs; run npm run rebuild-nfl-gsni)`,
    );
    return;
  }

  const raw = JSON.parse(fs.readFileSync(statsPath, "utf8")) as {
    refs: RefProfile[];
    [key: string]: unknown;
  };

  const attached = attachGsniFieldsFromGames(raw.refs, games.games, undefined, {
    minHighLeverageMinutes: config.minHighLeverageMinutes,
  });

  const updated = attached.map((ref, index) =>
    preserveGsniFields(ref, raw.refs[index]),
  );

  const withGsni = updated.filter((ref) => ref.referee_gsni !== undefined).length;
  const payload = `${JSON.stringify({ ...raw, refs: updated }, null, 2)}\n`;
  fs.writeFileSync(statsPath, payload);
  const corePath = corePathForLeague(leagueId);
  if (corePath && fs.existsSync(corePath)) {
    fs.writeFileSync(corePath, payload);
  }
  console.log(`${leagueId}: attached GSNI to ${withGsni}/${updated.length} refs`);
}

function main(): void {
  for (const leagueId of GSNI_LEAGUES) {
    rebuildLeagueGsni(leagueId);
  }
}

main();
