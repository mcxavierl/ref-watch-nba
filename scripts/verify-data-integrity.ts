#!/usr/bin/env npx tsx
/**
 * Sanity-check team game counts: DISTINCT game_id from logs vs crew-split totals.
 * Also verifies ref.games against DISTINCT game_id rows in game logs.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  countRefGamesFromLogs,
  countRefGamesFromLogsMatching,
  countTeamGamesFromLogs,
  gameCountDeviationPct,
  gameCountFromCrewSplits,
  type GameLogRow,
  type RefGameLogRow,
} from "../src/lib/game-count";
import {
  leagueTenSeasons,
} from "../src/lib/league-seasons";
import type { LeagueId } from "../src/lib/leagues";
import type { RefProfile, RefStatsFile, TeamCrewSplit } from "../src/lib/types";
import { auditRefIdentity } from "./lib/audit-ref-identity";
import { REF_GAME_COUNT_LEAGUES } from "./fix-ref-game-counts";
import { canonicalRefKey } from "./lib/ref-identity";
import { verifyBbrCoverage } from "./lib/verify-bbr-coverage";

const ROOT = process.cwd();

interface TeamIntegrityCheck {
  league: LeagueId;
  team: string;
  seasons: readonly string[];
  minGames: number;
  maxGames: number;
  label: string;
}

const TEAM_CHECKS: TeamIntegrityCheck[] = [
  {
    league: "nfl",
    team: "LAR",
    seasons: leagueTenSeasons("nfl"),
    minGames: 150,
    maxGames: 200,
    label: "Rams (LAR) last 10 seasons",
  },
  {
    league: "nfl",
    team: "KC",
    seasons: leagueTenSeasons("nfl"),
    minGames: 150,
    maxGames: 200,
    label: "Chiefs (KC) last 10 seasons",
  },
  {
    league: "nba",
    team: "LAL",
    seasons: leagueTenSeasons("nba"),
    minGames: 738,
    maxGames: 902,
    label: "Lakers (LAL) last 10 seasons",
  },
  {
    league: "nhl",
    team: "WPG",
    seasons: leagueTenSeasons("nhl"),
    minGames: 700,
    maxGames: 850,
    label: "Jets (WPG) last 10 seasons",
  },
  {
    league: "nhl",
    team: "TOR",
    seasons: leagueTenSeasons("nhl"),
    minGames: 700,
    maxGames: 850,
    label: "Maple Leafs (TOR) last 10 seasons",
  },
  {
    league: "epl",
    team: "ARS",
    seasons: leagueTenSeasons("epl"),
    minGames: 340,
    maxGames: 420,
    label: "Arsenal (ARS) last 10 seasons",
  },
  {
    league: "epl",
    team: "LIV",
    seasons: leagueTenSeasons("epl"),
    minGames: 340,
    maxGames: 420,
    label: "Liverpool (LIV) last 10 seasons",
  },
  {
    league: "laliga",
    team: "BAR",
    seasons: leagueTenSeasons("laliga"),
    minGames: 130,
    maxGames: 180,
    label: "Barcelona (BAR) scoped seasons",
  },
  {
    league: "laliga",
    team: "RMA",
    seasons: leagueTenSeasons("laliga"),
    minGames: 130,
    maxGames: 180,
    label: "Real Madrid (RMA) scoped seasons",
  },
  {
    league: "cbb",
    team: "DUKE",
    seasons: leagueTenSeasons("cbb"),
    minGames: 150,
    maxGames: 260,
    label: "Duke (DUKE) last 10 seasons",
  },
  {
    league: "cfb",
    team: "ALA",
    seasons: leagueTenSeasons("cfb"),
    minGames: 60,
    maxGames: 120,
    label: "Alabama (ALA) last 10 seasons",
  },
];

const GAME_LOG_PATHS: Partial<Record<LeagueId, string>> = {
  nba: "data/game-logs.json",
  nhl: "data/nhl/game-logs.json",
  nfl: "data/nfl/game-logs.json",
  epl: "data/epl/game-logs.json",
  laliga: "data/laliga/game-logs.json",
  cbb: "data/cbb/game-logs.json",
  cfb: "data/cfb/game-logs.json",
};

const TEAM_SPLITS_PATHS: Partial<Record<LeagueId, string>> = {
  nba: "data/team-splits.json",
  nhl: "data/nhl/team-splits.json",
  nfl: "data/nfl/team-splits.json",
  epl: "data/epl/team-splits.json",
  laliga: "data/laliga/team-splits.json",
  cbb: "data/cbb/team-splits.json",
  cfb: "data/cfb/team-splits.json",
};

const REF_STATS_PATHS: Partial<Record<LeagueId, string>> = Object.fromEntries(
  REF_GAME_COUNT_LEAGUES.map((league) => [league.id, league.corePath]),
) as Partial<Record<LeagueId, string>>;

const warnings: string[] = [];
const failures: string[] = [];

function warn(msg: string): void {
  warnings.push(msg);
  console.warn(`WARN: ${msg}`);
}

function fail(msg: string): void {
  failures.push(msg);
  console.error(`FAIL: ${msg}`);
}

function readJson<T>(rel: string): T | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(ROOT, rel), "utf8"),
    ) as T;
  } catch {
    return null;
  }
}

function loadGameRows(league: LeagueId): GameLogRow[] {
  const rel = GAME_LOG_PATHS[league];
  if (!rel) return [];
  const file = readJson<{ games?: GameLogRow[] }>(rel);
  return file?.games ?? [];
}

function loadRefGameRows(league: LeagueId): RefGameLogRow[] {
  const rel = GAME_LOG_PATHS[league];
  if (!rel) return [];
  const file = readJson<{ games?: RefGameLogRow[] }>(rel);
  return file?.games ?? [];
}

function loadRefStats(league: LeagueId): RefProfile[] {
  const rel = REF_STATS_PATHS[league];
  if (!rel) return [];
  const file = readJson<RefStatsFile>(rel);
  return file?.refs ?? [];
}

function loadTeamSplits(league: LeagueId): Record<string, TeamCrewSplit[]> {
  const rel = TEAM_SPLITS_PATHS[league];
  if (!rel) return {};
  return readJson<Record<string, TeamCrewSplit[]>>(rel) ?? {};
}

function checkTeamSample(check: TeamIntegrityCheck): void {
  const logs = loadGameRows(check.league);
  const splits = loadTeamSplits(check.league);
  const teamSplits = splits[check.team] ?? splits[check.team.toUpperCase()] ?? [];

  const logCount = countTeamGamesFromLogs(logs, check.team, check.seasons);
  const splitSum = teamSplits.reduce((sum, sp) => sum + sp.games, 0);
  const splitWl = gameCountFromCrewSplits(teamSplits);
  const allTimeLog = countTeamGamesFromLogs(logs, check.team);
  const mid = (check.minGames + check.maxGames) / 2;
  const logDeviation = gameCountDeviationPct(logCount, mid);

  console.log(
    `${check.label}: logs=${logCount} (expected ${check.minGames}-${check.maxGames}, ${logDeviation.toFixed(1)}% off midpoint), ` +
      `split.games sum=${splitSum}, split W-L=${splitWl}, all-time logs=${allTimeLog}`,
  );

  if (logCount < check.minGames || logCount > check.maxGames) {
    fail(
      `${check.label}: ${logCount} games outside expected range ${check.minGames}-${check.maxGames}`,
    );
  }

  if (splitSum > allTimeLog * 1.01 && allTimeLog > 0) {
    fail(
      `${check.label}: crew-split games sum (${splitSum}) exceeds all-time DISTINCT logs (${allTimeLog}) - likely double-counting`,
    );
  }

  if (logCount > 0 && splitSum > logCount * 1.1) {
    warn(
      `${check.label}: unscoped split sum (${splitSum}) is >10% above scoped log count (${logCount}) - index pages should use log-based counts`,
    );
  }
}

function checkRefGameCounts(
  league: LeagueId,
  maxDriftPct: number,
  useCanonicalKey: boolean,
): void {
  const logs = loadRefGameRows(league);
  const refs = loadRefStats(league);
  if (logs.length === 0 || refs.length === 0) {
    warn(`${league}: skipping ref game-count check (missing logs or ref stats)`);
    return;
  }

  const statsFile = readJson<RefStatsFile>(REF_STATS_PATHS[league]!);
  const seasons = statsFile?.meta.seasons?.length
    ? statsFile.meta.seasons
    : leagueTenSeasons(league);

  let mismatches = 0;
  let checked = 0;
  let refsWithGames = 0;
  const samples: string[] = [];

  for (const ref of refs) {
    if (ref.games > 0) refsWithGames++;
    const expected = useCanonicalKey
      ? countRefGamesFromLogsMatching(
          logs,
          (official) =>
            canonicalRefKey(official.name) === canonicalRefKey(ref.name),
          seasons,
        )
      : countRefGamesFromLogs(logs, ref.slug, seasons);
    if (expected === 0) continue;
    checked++;
    const drift = gameCountDeviationPct(ref.games, expected);
    if (drift > maxDriftPct) {
      mismatches++;
      if (samples.length < 5) {
        samples.push(`${ref.name}: stored=${ref.games} logs=${expected} (${drift.toFixed(1)}%)`);
      }
      fail(
        `${league.toUpperCase()} ref ${ref.name}: stored ${ref.games} vs DISTINCT logs ${expected} (${drift.toFixed(1)}% drift)`,
      );
    }
  }

  console.log(
    `${league.toUpperCase()} ref game counts: checked ${checked}, mismatches ${mismatches} (max ${maxDriftPct}% drift)`,
  );
  if (refsWithGames > 0 && checked === 0) {
    warn(
      `${league}: ${refsWithGames} refs have stored games but none match DISTINCT game_id rows in logs - ref-stats may be stale or from another league`,
    );
  }
  if (samples.length > 0) {
    console.log(`  samples: ${samples.join("; ")}`);
  }
}

function checkBbrFixtureCoverage(): void {
  const result = verifyBbrCoverage(ROOT);
  console.log(
    `BBR ref×team fixture: ${result.entryCount}/150 team-seasons, ${result.refTeamPairs} ref×team pairs` +
      (result.refTeamWinLossSource
        ? `, ref-stats overlay=${result.refTeamWinLossSource}`
        : ""),
  );
  for (const msg of result.warnings) warn(msg);
  for (const msg of result.errors) fail(msg);
}

function main(): void {
  console.log("Data integrity verification\n");

  checkBbrFixtureCoverage();
  console.log("");

  for (const check of TEAM_CHECKS) {
    checkTeamSample(check);
  }

  console.log("");
  for (const league of REF_GAME_COUNT_LEAGUES) {
    checkRefGameCounts(
      league.id as LeagueId,
      league.maxDriftPct,
      league.useCanonicalKey,
    );
  }

  console.log("");
  const identityAudit = auditRefIdentity(ROOT);
  if (identityAudit.findings.length === 0) {
    console.log("Ref identity audit: no duplicate profiles or reverse-name ghosts");
  } else {
    for (const msg of identityAudit.failures) {
      fail(msg);
    }
  }

  console.log("");
  if (warnings.length > 0) {
    console.log(`${warnings.length} warning(s)`);
  }
  if (failures.length > 0) {
    console.error(`\n${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log("All integrity checks passed.");
}

main();
