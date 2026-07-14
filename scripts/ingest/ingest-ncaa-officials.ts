#!/usr/bin/env npx tsx
/**
 * Ingest NCAA CBB/CFB official rosters, resolve cross-league identities,
 * merge RefProfile stubs, and publish personnel-profiles sidecar.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { bootstrapNcaaRosterCsvs } from "./bootstrap-ncaa-rosters";
import {
  buildProLeagueOfficialIndex,
  summarizeEntityResolution,
} from "./lib/ncaa-entity-resolution";
import {
  buildNcaaPersonnelProfileFile,
  experienceBreakdown,
  mergeNcaaProfilesIntoRefStats,
  normalizeNcaaRosterRow,
} from "./lib/ncaa-normalize";
import {
  readNcaaOfficialsCsv,
  validateNcaaRosterIntegrity,
} from "./lib/ncaa-roster-parser";
import type { RefStatsFile } from "../../src/lib/types";

const ROOT = process.cwd();
const NCAA_DATA_DIR = path.join(ROOT, "data", "ncaa");
const PERSONNEL_PATH = path.join(NCAA_DATA_DIR, "personnel-profiles.json");
const CBB_STATS_PATH = path.join(ROOT, "data", "cbb", "ref-stats.json");
const CFB_STATS_PATH = path.join(ROOT, "data", "cfb", "ref-stats.json");

function loadRefStats(filePath: string): RefStatsFile {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ref-stats file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as RefStatsFile;
}

function writeJson(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function main(): void {
  const forceBootstrap = process.argv.includes("--force-bootstrap");
  const dryRun = process.argv.includes("--dry-run");

  const { cbbPath, cfbPath, bootstrapped } = bootstrapNcaaRosterCsvs({
    force: forceBootstrap,
  });
  if (bootstrapped.cbb || bootstrapped.cfb) {
    console.log(
      `Bootstrapped raw rosters: CBB=${bootstrapped.cbb ? "yes" : "no"}, CFB=${bootstrapped.cfb ? "yes" : "no"}`,
    );
  }

  const cbbParsed = readNcaaOfficialsCsv(cbbPath, "CBB");
  const cfbParsed = readNcaaOfficialsCsv(cfbPath, "CFB");
  const parseErrors = [...cbbParsed.errors, ...cfbParsed.errors];
  if (parseErrors.length > 0) {
    console.error("CSV parse errors:");
    for (const error of parseErrors) console.error(`  - ${error}`);
    process.exit(1);
  }

  const cbbIntegrity = validateNcaaRosterIntegrity(cbbParsed.rows);
  const cfbIntegrity = validateNcaaRosterIntegrity(cfbParsed.rows);
  const integrityFailures = [
    ...cbbIntegrity.failures,
    ...cfbIntegrity.failures,
  ];
  if (!cbbIntegrity.valid || !cfbIntegrity.valid) {
    console.error("Data integrity validation failed:");
    for (const failure of integrityFailures) {
      console.error(
        `  Row ${failure.row} (${failure.officialId}): ${failure.reasons.join("; ")}`,
      );
    }
    process.exit(1);
  }

  const proIndex = buildProLeagueOfficialIndex(ROOT);
  const cbbProfiles = cbbParsed.rows.map((row) =>
    normalizeNcaaRosterRow(row, "CBB", proIndex),
  );
  const cfbProfiles = cfbParsed.rows.map((row) =>
    normalizeNcaaRosterRow(row, "CFB", proIndex),
  );
  const allProfiles = [...cbbProfiles, ...cfbProfiles];

  const cbbStats = loadRefStats(CBB_STATS_PATH);
  const cfbStats = loadRefStats(CFB_STATS_PATH);
  const cbbMerge = mergeNcaaProfilesIntoRefStats(cbbStats, cbbProfiles);
  const cfbMerge = mergeNcaaProfilesIntoRefStats(cfbStats, cfbProfiles);
  const personnel = buildNcaaPersonnelProfileFile(allProfiles);

  const cbbResolution = summarizeEntityResolution(cbbProfiles);
  const cfbResolution = summarizeEntityResolution(cfbProfiles);
  const cbbExperience = experienceBreakdown(cbbProfiles);
  const cfbExperience = experienceBreakdown(cfbProfiles);

  console.log("NCAA officials ingest summary:");
  console.log(`  CBB roster rows: ${cbbProfiles.length}`);
  console.log(`  CFB roster rows: ${cfbProfiles.length}`);
  console.log(
    `  Pro-league matches: CBB ${cbbResolution.matched}/${cbbResolution.total}, CFB ${cfbResolution.matched}/${cfbResolution.total}`,
  );
  console.log(
    `  RefProfile merge: CBB +${cbbMerge.added} new / ${cbbMerge.skipped} existing; CFB +${cfbMerge.added} new / ${cfbMerge.skipped} existing`,
  );
  console.log(`  CBB experience: ${JSON.stringify(cbbExperience)}`);
  console.log(`  CFB experience: ${JSON.stringify(cfbExperience)}`);

  if (dryRun) {
    console.log("Dry run — no files written.");
    return;
  }

  writeJson(PERSONNEL_PATH, personnel);
  writeJson(CBB_STATS_PATH, cbbMerge.stats);
  writeJson(CFB_STATS_PATH, cfbMerge.stats);

  console.log(`Wrote ${PERSONNEL_PATH}`);
  console.log(`Updated ${CBB_STATS_PATH}`);
  console.log(`Updated ${CFB_STATS_PATH}`);
}

main();
