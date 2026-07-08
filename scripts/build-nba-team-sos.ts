/**
 * Build cached NBA strength-of-schedule context from local game logs and
 * Basketball-Reference season standings (nba-team-season-records.ts).
 *
 * Run: npx tsx scripts/build-nba-team-sos.ts
 * Output: data/nba-team-sos.json (copied to public/ at build time)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { NBA_TEAM_ORDER, DEFAULT_SINCE_SEASON } from "../src/lib/nba-team-season-records";
import { computeStrengthOfSchedule } from "../src/lib/nba-strength-of-schedule";
import { loadGameLogs } from "./lib/game-logs";

const SINCE_SEASON = DEFAULT_SINCE_SEASON;
const OUT_PATH = path.join(process.cwd(), "data", "nba-team-sos.json");

function main(): void {
  const logs = loadGameLogs("NBA");
  if (!logs) {
    console.error("Missing data/game-logs.json");
    process.exit(1);
  }

  const seasons = [
    ...new Set(logs.games.map((g) => g.season)),
  ].sort();
  const scopedSeasons = seasons.filter((s) => s >= SINCE_SEASON);

  const teams: Record<string, ReturnType<typeof computeStrengthOfSchedule>> =
    {};

  for (const abbr of NBA_TEAM_ORDER) {
    const sos = computeStrengthOfSchedule(logs.games, abbr, {
      sinceSeason: SINCE_SEASON,
      seasons: scopedSeasons,
    });
    if (sos) teams[abbr] = sos;
  }

  const payload = {
    lastUpdated: new Date().toISOString(),
    source: "game-logs + basketball-reference-standings",
    sinceSeason: SINCE_SEASON,
    seasons: scopedSeasons,
    teams,
  };

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Wrote ${OUT_PATH} (${Object.keys(teams).length} teams, ${logs.games.length} games in source)`,
  );
}

main();
