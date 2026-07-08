import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { normalizeRefName } from "../../src/lib/bbr-ref-team-records";
import {
  getOfficialSeasonRecord,
  NBA_REGULAR_SEASON_RECORDS,
} from "../../src/lib/nba-team-season-records";
import {
  DISCREPANCIES_PATH,
  expectedGameCount,
  GAME_LOGS_DIR,
  INGEST_SEASONS,
  MANIFEST_PATH,
  NBA_TEAM_ABBRS,
  SAMPLE_REFS_FOR_TOTAL_CHECK,
  seasonToBbrYear,
  type IngestSeason,
} from "./config";
import type { MergedGame, Discrepancy } from "./merge-games";
import {
  aggregateRecordsFromGames,
  parseBbrStandings,
} from "./parse-standings";
import type { BbrRefIndexEntry } from "./parse-ref-index";

export interface ValidationResult {
  check: string;
  passed: boolean;
  detail: string;
}

function loadBbrChunksRefTotals(
  referee: string,
  team: string,
  season: IngestSeason,
): { games: number } | null {
  const chunkPath = path.join(
    process.cwd(),
    "data",
    "bbr-chunks",
    `${team}_${seasonToBbrYear(season)}.json`,
  );
  if (!fs.existsSync(chunkPath)) return null;
  const chunk = JSON.parse(fs.readFileSync(chunkPath, "utf8")) as {
    referees: { referee: string; games: number }[];
  };
  const norm = normalizeRefName(referee);
  const row = chunk.referees.find((r) => normalizeRefName(r.referee) === norm);
  return row ? { games: row.games } : null;
}

export function validateOfficials(
  games: MergedGame[],
  refIndex: Map<string, BbrRefIndexEntry>,
): ValidationResult[] {
  const results: ValidationResult[] = [];
  let badCount = 0;
  let unmatched = 0;

  for (const game of games) {
    const count = game.officials.length;
    if (count !== 3) {
      badCount++;
      results.push({
        check: "officials-count",
        passed: false,
        detail: `Game ${game.gameId} has ${count} officials (expected 3)`,
      });
      continue;
    }
    for (const official of game.officials) {
      if (!official.name?.trim()) {
        badCount++;
        results.push({
          check: "officials-empty",
          passed: false,
          detail: `Game ${game.gameId} has empty official name`,
        });
      }
      if (!official.number || official.number <= 0) {
        badCount++;
        results.push({
          check: "officials-number",
          passed: false,
          detail: `Official ${official.name} missing jersey number (game ${game.gameId})`,
        });
      }
      const idx = refIndex.get(normalizeRefName(official.name));
      if (!idx) {
        unmatched++;
        results.push({
          check: "officials-index",
          passed: false,
          detail: `Official ${official.name} not in ref index (game ${game.gameId})`,
        });
      }
    }
  }

  if (badCount === 0 && unmatched === 0) {
    results.push({
      check: "officials",
      passed: true,
      detail: `All ${games.length} games have exactly 3 resolvable officials`,
    });
  }
  return results;
}

export function validateSeasonCounts(
  games: MergedGame[],
): ValidationResult[] {
  const results: ValidationResult[] = [];
  for (const season of INGEST_SEASONS) {
    const regular = games.filter((g) => g.season === season && !g.isPlayoff);
    const expected = expectedGameCount(season);
    const passed = regular.length === expected;
    results.push({
      check: `season-count-${season}`,
      passed,
      detail: `Season ${season}: parsed ${regular.length}, expected ${expected}`,
    });
  }
  return results;
}

export function validateTeamRecords(
  games: MergedGame[],
  standingsHtmlBySeason: Record<string, string>,
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const regularGames = games.filter((g) => !g.isPlayoff);

  for (const season of INGEST_SEASONS) {
    const seasonGames = regularGames.filter((g) => g.season === season);
    const fromLogs = aggregateRecordsFromGames(seasonGames);
    const fromStandings = parseBbrStandings(
      standingsHtmlBySeason[season] ?? "",
      season,
    );

    for (const team of NBA_TEAM_ABBRS) {
      const logRec = fromLogs[team];
      const standRec = fromStandings[team];
      const fixtureRec = NBA_REGULAR_SEASON_RECORDS[season]?.[team];

      const expected = standRec ?? fixtureRec;
      if (!logRec || !expected) {
        results.push({
          check: `team-record-${season}-${team}`,
          passed: false,
          detail: `Missing record for ${team} ${season}`,
        });
        continue;
      }

      const passed =
        logRec.wins === expected.wins && logRec.losses === expected.losses;
      results.push({
        check: `team-record-${season}-${team}`,
        passed,
        detail: `${team} ${season}: logs ${logRec.wins}-${logRec.losses} vs expected ${expected.wins}-${expected.losses}`,
      });
    }
  }
  return results;
}

export function validateRefTotals(
  games: MergedGame[],
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const refName of SAMPLE_REFS_FOR_TOTAL_CHECK) {
    const norm = normalizeRefName(refName);
    const fromLogs = games.filter((g) =>
      g.officials.some((o) => normalizeRefName(o.name) === norm),
    ).length;

    let bbrTotal = 0;
    let matchedTeams = 0;
    for (const team of ["OKC", "LAL", "BOS", "MIA", "DEN"] as const) {
      for (const season of INGEST_SEASONS) {
        const chunk = loadBbrChunksRefTotals(refName, team, season);
        if (chunk) {
          bbrTotal += chunk.games;
          matchedTeams++;
        }
      }
    }

    if (matchedTeams === 0) {
      results.push({
        check: `ref-total-${normalizeRefName(refName)}`,
        passed: false,
        detail: `No BBR chunk data for sample ref ${refName}`,
      });
      continue;
    }

    const delta = Math.abs(fromLogs - bbrTotal);
    const passed = delta <= 2;
    results.push({
      check: `ref-total-${normalizeRefName(refName)}`,
      passed,
      detail: `${refName}: log games ${fromLogs} vs BBR sample aggregate ${bbrTotal} (delta ${delta})`,
    });
  }
  return results;
}

export function validateOkcFixture(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const checks: [IngestSeason, number, number][] = [
    ["2021-22", 24, 58],
    ["2022-23", 40, 42],
    ["2023-24", 57, 25],
    ["2024-25", 68, 14],
    ["2025-26", 64, 18],
  ];

  for (const [season, wins, losses] of checks) {
    const rec = getOfficialSeasonRecord("OKC", season);
    const passed = rec?.wins === wins && rec?.losses === losses;
    results.push({
      check: `okc-fixture-${season}`,
      passed: !!passed,
      detail: `OKC ${season} fixture ${rec?.wins}-${rec?.losses} expected ${wins}-${losses}`,
    });
  }
  return results;
}

export function validateDiscrepancies(
  discrepancies: Discrepancy[],
): ValidationResult {
  return {
    check: "cross-source-discrepancies",
    passed: discrepancies.length === 0,
    detail:
      discrepancies.length === 0
        ? "No BBR/NBA Stats cross-source discrepancies"
        : `${discrepancies.length} discrepancies — see ${DISCREPANCIES_PATH}`,
  };
}

export function runAllValidations(
  games: MergedGame[],
  discrepancies: Discrepancy[],
  refIndex: Map<string, BbrRefIndexEntry>,
  standingsHtmlBySeason: Record<string, string>,
): ValidationResult[] {
  return [
    validateDiscrepancies(discrepancies),
    ...validateSeasonCounts(games),
    ...validateOfficials(games, refIndex),
    ...validateRefTotals(games),
    ...validateTeamRecords(games, standingsHtmlBySeason),
    ...validateOkcFixture(),
  ];
}

export function assertAllPassed(results: ValidationResult[]): void {
  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error("\n=== VALIDATION FAILED ===");
    for (const f of failed) {
      console.error(`  [FAIL] ${f.check}: ${f.detail}`);
    }
    throw new Error(`${failed.length} validation check(s) failed`);
  }
}

export function writeDiscrepancies(discrepancies: Discrepancy[]): void {
  fs.mkdirSync(path.dirname(DISCREPANCIES_PATH), { recursive: true });
  fs.writeFileSync(
    DISCREPANCIES_PATH,
    discrepancies.map((d) => JSON.stringify(d)).join("\n") +
      (discrepancies.length ? "\n" : ""),
  );
}

export function checksumFile(filePath: string): string {
  const raw = fs.readFileSync(filePath, "utf8");
  return createHash("sha256").update(raw).digest("hex");
}

export function writeManifest(
  games: MergedGame[],
  pagesFetched: number,
): void {
  const seasons: Record<string, { game_count: number; checksum: string }> = {};

  for (const season of INGEST_SEASONS) {
    const shardPath = path.join(GAME_LOGS_DIR, `${season}.ndjson`);
    seasons[season] = {
      game_count: games.filter((g) => g.season === season && !g.isPlayoff).length,
      checksum: fs.existsSync(shardPath) ? checksumFile(shardPath) : "",
    };
  }

  const manifest = {
    last_ingested_at: new Date().toISOString(),
    data_verified: true,
    data_source: "Basketball-Reference + NBA Stats API",
    seasons,
    total_games: games.filter((g) => !g.isPlayoff).length,
    pages_fetched: pagesFetched,
  };

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}
