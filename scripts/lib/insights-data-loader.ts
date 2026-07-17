import * as fs from "node:fs";
import * as path from "node:path";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { pick } from "stream-json/filters/Pick";
import { streamArray } from "stream-json/streamers/StreamArray";
import { streamValues } from "stream-json/streamers/StreamValues";
import type { RefProfile, RefStatsFile, TeamCrewSplit } from "../../src/lib/types";
import {
  stripRefProfileForInsights,
  type SlimLeagueStats,
  type SlimRefProfile,
} from "../../src/lib/insights/insight-input-slim";
import type { LeagueGeneratorSetup } from "../../src/lib/insights/generator-core";
import { OVERVIEW_INSIGHT_LEAGUE_IDS } from "../../src/lib/league-verification";

function dataRoot(): string {
  return process.env.INSIGHTS_BUILD_ROOT ?? process.cwd();
}

const REF_BATCH_SIZE = 40;

export type OverviewInsightLeagueId = (typeof OVERVIEW_INSIGHT_LEAGUE_IDS)[number];

export type SlimLeagueStatsForInsights = SlimLeagueStats & {
  getTeamSplits: (abbr: string) => TeamCrewSplit[];
};

type LeagueDataPaths = {
  refStatsCore: string;
  refStatsFull: string;
  teamSplits: string;
};

function leagueDataPaths(leagueId: OverviewInsightLeagueId): LeagueDataPaths {
  const root = dataRoot();
  if (leagueId === "nba") {
    return {
      refStatsCore: path.join(root, "data", "ref-stats-core.json"),
      refStatsFull: path.join(root, "data", "ref-stats.json"),
      teamSplits: path.join(root, "data", "team-splits.json"),
    };
  }
  const leagueDir = path.join(root, "data", leagueId);
  return {
    refStatsCore: path.join(leagueDir, "ref-stats-core.json"),
    refStatsFull: path.join(leagueDir, "ref-stats.json"),
    teamSplits: path.join(leagueDir, "team-splits.json"),
  };
}

function resolveRefStatsPath(paths: LeagueDataPaths): string | null {
  if (fs.existsSync(paths.refStatsCore)) return paths.refStatsCore;
  if (fs.existsSync(paths.refStatsFull)) return paths.refStatsFull;
  return null;
}

/** Max mtime across ref-stats-core, team-splits, and ref-stats when present. */
export function getLeagueInsightSourceMtime(leagueId: OverviewInsightLeagueId): number {
  const paths = leagueDataPaths(leagueId);
  const candidates = [paths.refStatsCore, paths.teamSplits, paths.refStatsFull];
  let maxMtime = 0;
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    maxMtime = Math.max(maxMtime, fs.statSync(filePath).mtimeMs);
  }
  return maxMtime;
}

function readMetaFromRefStatsFile(filePath: string): Promise<RefStatsFile["meta"]> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const pipeline = chain([
      fs.createReadStream(filePath),
      parser(),
      pick({ filter: "meta" }),
      streamValues(),
    ]);
    pipeline.on("data", ({ value }: { value: RefStatsFile["meta"] }) => {
      settled = true;
      resolve(value);
    });
    pipeline.on("error", reject);
    pipeline.on("end", () => {
      if (!settled) reject(new Error(`No meta found in ${filePath}`));
    });
  });
}

function readOptionalJsonField<T>(
  filePath: string,
  filter: string,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const pipeline = chain([
      fs.createReadStream(filePath),
      parser(),
      pick({ filter }),
      streamValues(),
    ]);
    pipeline.on("data", ({ value }: { value: T }) => {
      settled = true;
      resolve(value);
    });
    pipeline.on("error", reject);
    pipeline.on("end", () => {
      if (!settled) resolve(undefined);
    });
  });
}

async function streamRefsFromFile(
  filePath: string,
  onBatch: (refs: RefProfile[]) => void | Promise<void>,
): Promise<void> {
  let batch: RefProfile[] = [];

  await new Promise<void>((resolve, reject) => {
    const pipeline = chain([
      fs.createReadStream(filePath),
      parser(),
      pick({ filter: "refs" }),
      streamArray(),
    ]);

    pipeline.on("data", ({ value }: { value: RefProfile }) => {
      batch.push(value);
      if (batch.length >= REF_BATCH_SIZE) {
        pipeline.pause();
        void Promise.resolve(onBatch(batch))
          .then(() => {
            batch = [];
            pipeline.resume();
          })
          .catch(reject);
      }
    });

    pipeline.on("end", () => {
      void Promise.resolve(batch.length > 0 ? onBatch(batch) : undefined)
        .then(() => resolve())
        .catch(reject);
    });

    pipeline.on("error", reject);
  });
}

function loadTeamSplitsMap(teamSplitsPath: string): Record<string, TeamCrewSplit[]> {
  if (!fs.existsSync(teamSplitsPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(teamSplitsPath, "utf8")) as Record<
      string,
      TeamCrewSplit[]
    >;
  } catch {
    return {};
  }
}

/**
 * Build-only loader: streams ref-stats-core (or full ref-stats) without runtime jsonCache.
 */
export async function loadSlimLeagueStatsForInsights(
  leagueId: OverviewInsightLeagueId,
): Promise<SlimLeagueStatsForInsights | null> {
  const paths = leagueDataPaths(leagueId);
  const refStatsPath = resolveRefStatsPath(paths);
  if (!refStatsPath) return null;

  const teamSplitsMap = loadTeamSplitsMap(paths.teamSplits);
  const getTeamSplits = (abbr: string): TeamCrewSplit[] =>
    teamSplitsMap[abbr.toUpperCase()] ?? [];

  const meta = await readMetaFromRefStatsFile(refStatsPath);
  const teamAtsBaselines = await readOptionalJsonField<
    RefStatsFile["teamAtsBaselines"]
  >(refStatsPath, "teamAtsBaselines");

  const refs: SlimRefProfile[] = [];

  await streamRefsFromFile(refStatsPath, (batch) => {
    for (const ref of batch) {
      refs.push(stripRefProfileForInsights(ref));
    }
    batch.length = 0;
  });

  return {
    meta,
    refs,
    teamAtsBaselines,
    getTeamSplits,
  };
}

export async function loadLeagueGeneratorSetup(
  leagueId: OverviewInsightLeagueId,
  getTeamSplits: (abbr: string) => TeamCrewSplit[],
): Promise<LeagueGeneratorSetup> {
  switch (leagueId) {
    case "nba": {
      const { NBA_TEAMS, teamFullName } = await import("../../src/lib/teams");
      return {
        leagueId,
        teams: NBA_TEAMS.map((team) => ({
          abbr: team.abbr,
          label: teamFullName(team),
          name: team.name,
          nbaId: team.nbaId,
        })),
        getTeamSplits,
        matrixLeague: "nba",
      };
    }
    case "nhl": {
      const { NHL_TEAMS, teamFullName } = await import("../../src/lib/nhl/teams");
      return {
        leagueId,
        teams: NHL_TEAMS.map((team) => ({
          abbr: team.abbr,
          label: teamFullName(team),
          name: team.name,
        })),
        getTeamSplits,
        matrixLeague: "nhl",
      };
    }
    case "nfl": {
      const { NFL_TEAMS, teamFullName } = await import("../../src/lib/nfl/teams");
      return {
        leagueId,
        teams: NFL_TEAMS.map((team) => ({
          abbr: team.abbr,
          label: teamFullName(team),
          name: team.name,
        })),
        getTeamSplits,
        matrixLeague: "nfl",
      };
    }
    case "epl": {
      const { EPL_TEAMS, teamFullName } = await import("../../src/lib/epl/teams");
      return {
        leagueId,
        teams: EPL_TEAMS.map((team) => ({
          abbr: team.abbr,
          label: teamFullName(team),
          name: team.name,
        })),
        getTeamSplits,
        matrixLeague: "epl",
      };
    }
    case "laliga": {
      const { LALIGA_TEAMS, teamFullName } = await import("../../src/lib/laliga/teams");
      return {
        leagueId,
        teams: LALIGA_TEAMS.map((team) => ({
          abbr: team.abbr,
          label: teamFullName(team),
          name: team.name,
        })),
        getTeamSplits,
        matrixLeague: "laliga",
      };
    }
    case "cbb": {
      const { CBB_TEAMS, teamFullName } = await import("../../src/lib/cbb/teams");
      return {
        leagueId,
        teams: CBB_TEAMS.map((team) => ({
          abbr: team.abbr,
          label: teamFullName(team),
          name: team.name,
        })),
        getTeamSplits,
        matrixLeague: "cbb",
      };
    }
    case "cfb": {
      const { CFB_TEAMS, teamFullName } = await import("../../src/lib/cfb/teams");
      return {
        leagueId,
        teams: CFB_TEAMS.map((team) => ({
          abbr: team.abbr,
          label: teamFullName(team),
          name: team.name,
        })),
        getTeamSplits,
        matrixLeague: "cfb",
      };
    }
  }
}

export function tryClearDataModuleCaches(): void {
  const modules = [
    "../../src/lib/data",
    "../../src/lib/cbb/data",
    "../../src/lib/cfb/data",
    "../../src/lib/nhl/data",
    "../../src/lib/nfl/data",
    "../../src/lib/epl/data",
    "../../src/lib/laliga/data",
  ];
  for (const modPath of modules) {
    try {
      const resolved = require.resolve(modPath);
      delete require.cache[resolved];
    } catch {
      // module not loaded — nothing to clear
    }
  }
}

export function tryRunGc(): void {
  try {
    const gc = (globalThis as { gc?: () => void }).gc;
    gc?.();
  } catch {
    // no-op when --expose-gc is unavailable
  }
}
