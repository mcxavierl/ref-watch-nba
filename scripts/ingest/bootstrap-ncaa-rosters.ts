#!/usr/bin/env npx tsx
/**
 * Bootstrap NCAA raw roster CSVs when source files are not yet present.
 * CBB: derived from ESPN-verified ref-stats; CFB: derived from NFL cross-sport pool.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  conferenceToPrimaryRegion,
  inferConferenceFromTeamStats,
  officialIdForSport,
} from "../../src/lib/ncaa-personnel-enrichment";
import type { RefStatsFile } from "../../src/lib/types";
import { refSlug } from "../lib/slug";

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, "data", "ncaa", "raw");

const CSV_HEADER =
  "official_id,name,number,conference,primary_region,historical_game_count,status";

function loadStats(relativePath: string): RefStatsFile | null {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as RefStatsFile;
}

function toCsvRow(fields: (string | number)[]): string {
  return fields
    .map((value) => {
      const text = String(value);
      return text.includes(",") ? `"${text.replace(/"/g, '""')}"` : text;
    })
    .join(",");
}

function bootstrapCbbCsv(): string {
  const stats = loadStats("data/cbb/ref-stats.json");
  if (!stats?.refs?.length) {
    throw new Error("Cannot bootstrap CBB roster: data/cbb/ref-stats.json is empty");
  }

  const rows = stats.refs.map((ref) => {
    const slug = refSlug(ref.name, ref.number);
    const conference = inferConferenceFromTeamStats(ref.teamStats);
    const primaryRegion = conferenceToPrimaryRegion(conference);
    return toCsvRow([
      officialIdForSport("CBB", slug),
      ref.name,
      ref.number,
      conference,
      primaryRegion,
      ref.games,
      "active",
    ]);
  });

  return [CSV_HEADER, ...rows].join("\n") + "\n";
}

function bootstrapCfbCsv(): string {
  const nflStats = loadStats("data/nfl/ref-stats.json");
  if (!nflStats?.refs?.length) {
    throw new Error("Cannot bootstrap CFB roster: data/nfl/ref-stats.json is empty");
  }

  const rows = nflStats.refs.map((ref) => {
    const slug = refSlug(ref.name, ref.number);
    const conference = "Other";
    const primaryRegion = conferenceToPrimaryRegion(conference);
    return toCsvRow([
      officialIdForSport("CFB", slug),
      ref.name,
      ref.number,
      conference,
      primaryRegion,
      ref.games,
      ref.games > 0 ? "active" : "inactive",
    ]);
  });

  return [CSV_HEADER, ...rows].join("\n") + "\n";
}

export function bootstrapNcaaRosterCsvs(options?: { force?: boolean }): {
  cbbPath: string;
  cfbPath: string;
  bootstrapped: { cbb: boolean; cfb: boolean };
} {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const cbbPath = path.join(RAW_DIR, "ncaa_cbb_officials_2024.csv");
  const cfbPath = path.join(RAW_DIR, "ncaa_cfb_officials_2024.csv");
  const bootstrapped = { cbb: false, cfb: false };

  if (options?.force || !fs.existsSync(cbbPath)) {
    fs.writeFileSync(cbbPath, bootstrapCbbCsv(), "utf8");
    bootstrapped.cbb = true;
  }
  if (options?.force || !fs.existsSync(cfbPath)) {
    fs.writeFileSync(cfbPath, bootstrapCfbCsv(), "utf8");
    bootstrapped.cfb = true;
  }

  return { cbbPath, cfbPath, bootstrapped };
}

function main(): void {
  const force = process.argv.includes("--force");
  const result = bootstrapNcaaRosterCsvs({ force });
  console.log(
    `NCAA roster CSVs ready:\n  CBB: ${result.cbbPath}${result.bootstrapped.cbb ? " (bootstrapped)" : ""}\n  CFB: ${result.cfbPath}${result.bootstrapped.cfb ? " (bootstrapped)" : ""}`,
  );
}

if (process.argv[1]?.endsWith("bootstrap-ncaa-rosters.ts")) {
  main();
}
