#!/usr/bin/env npx tsx
/**
 * Download closing spread/total lines from nflverse games.csv.
 * Output: data/nfl/game-lines.json (ESPN id + date/team keys for matching).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { OddsFile } from "../../src/lib/types";
import {
  buildNflverseLineIndex,
  fetchNflverseGamesCsv,
  toGameOddsLines,
} from "./lib/nflverse-lines";

const OUT_PATH = path.join(process.cwd(), "data", "nfl", "game-lines.json");
const CACHE_PATH = path.join(process.cwd(), "data", "nfl", "nflverse-games.csv");
const MIN_SEASON = 2021;

async function main() {
  console.log("Fetching nflverse games.csv...");
  const csv = await fetchNflverseGamesCsv();
  fs.writeFileSync(CACHE_PATH, csv);
  const index = buildNflverseLineIndex(csv, MIN_SEASON);

  const data: OddsFile = {
    lastUpdated: new Date().toISOString(),
    source: "nflverse" as OddsFile["source"],
    note:
      "Closing spread/total from nflverse nfldata games.csv (spread_line, total_line). " +
      "Matched to ESPN game ids where available.",
    lines: toGameOddsLines(index.lines),
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(data, null, 2)}\n`);

  const withEspn = index.lines.filter((l) => l.espnId).length;
  console.log(
    `Wrote ${data.lines.length} lines (${withEspn} with ESPN ids) → ${OUT_PATH}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
