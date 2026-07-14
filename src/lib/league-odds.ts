import * as fs from "node:fs";
import * as path from "node:path";
import type { LeagueId } from "@/lib/leagues";
import { getWorkerIsolateStore } from "@/lib/worker-isolate-store";
import type { AssignmentsFile, OddsFile } from "@/lib/types";
import { getAssignments as getNbaAssignments } from "@/lib/data";
import { getAssignments as getNhlAssignments } from "@/lib/nhl/data";
import { getAssignments as getNflAssignments } from "@/lib/nfl/data";
import { getAssignments as getEplAssignments } from "@/lib/epl/data";
import { getAssignments as getLaligaAssignments } from "@/lib/laliga/data";
import { getAssignments as getCbbAssignments } from "@/lib/cbb/data";
import { getAssignments as getCfbAssignments } from "@/lib/cfb/data";

const EMPTY_ODDS: OddsFile = {
  lastUpdated: new Date().toISOString(),
  source: "benchmark",
  note: "No odds shard available for this league.",
  lines: [],
};

const LEAGUE_ODDS_PATHS: Partial<Record<LeagueId, string[]>> = {
  nba: ["data/odds.json"],
  wnba: ["data/odds.json"],
  mlb: ["data/odds.json"],
  nhl: ["data/nhl/odds.json", "data/odds.json"],
  nfl: ["data/nfl/odds.json", "data/nfl/game-lines.json"],
  epl: ["data/epl/odds.json"],
  laliga: ["data/laliga/odds.json"],
  cbb: ["data/cbb/odds.json"],
  cfb: ["data/cfb/odds.json"],
};

function readOddsShard(relativePath: string): OddsFile | null {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
    const parsed = JSON.parse(raw) as OddsFile;
    if (!parsed.lines?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Request-scoped read of the latest market odds shard for a league. */
export function loadLeagueOddsShard(leagueId: LeagueId): OddsFile {
  const cacheKey = `league-odds:v1:${leagueId}`;
  const cached = getWorkerIsolateStore().matrixCompute.get(cacheKey);
  if (cached) return cached as OddsFile;

  const candidates = LEAGUE_ODDS_PATHS[leagueId] ?? [];
  for (const candidate of candidates) {
    const shard = readOddsShard(candidate);
    if (shard) {
      getWorkerIsolateStore().matrixCompute.set(cacheKey, shard);
      return shard;
    }
  }

  getWorkerIsolateStore().matrixCompute.set(cacheKey, EMPTY_ODDS);
  return EMPTY_ODDS;
}

const ASSIGNMENT_LOADERS: Partial<Record<LeagueId, () => AssignmentsFile>> = {
  nba: getNbaAssignments,
  wnba: getNbaAssignments,
  mlb: getNbaAssignments,
  nhl: getNhlAssignments,
  nfl: getNflAssignments,
  epl: getEplAssignments,
  laliga: getLaligaAssignments,
  cbb: getCbbAssignments,
  cfb: getCfbAssignments,
};

/** Request-scoped tonight's crew assignments for EV line matching. */
export function loadLeagueAssignments(leagueId: LeagueId): AssignmentsFile | undefined {
  const cacheKey = `league-assignments:v1:${leagueId}`;
  const cached = getWorkerIsolateStore().matrixCompute.get(cacheKey);
  if (cached) return cached as AssignmentsFile;

  const loader = ASSIGNMENT_LOADERS[leagueId];
  if (!loader) return undefined;

  const assignments = loader();
  getWorkerIsolateStore().matrixCompute.set(cacheKey, assignments);
  return assignments;
}
