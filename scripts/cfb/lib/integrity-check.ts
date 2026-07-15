import * as fs from "node:fs";
import * as path from "node:path";
import { CFB_TEAM_ABBRS } from "../../../src/lib/cfb/teams";
import {
  isCfbPipelineConferenceGame,
  resolveConferenceSpec,
  type CfbConferenceSlug,
} from "./conferences";
import { fetchTeamSchedule, sleep } from "./espn";
import { CFB_ESPN_TEAM_IDS } from "./team-ids";
import type { CfbGameLogEntry } from "./transform";
import type { CfbMissingDataReport, CfbPipelineJob } from "./pipeline-types";

const CONF_LABEL_TO_SLUG: Record<string, CfbConferenceSlug> = {
  SEC: "sec",
  ACC: "acc",
  "Big Ten": "big-ten",
  "Big 12": "big-12",
};

function gameBelongsToConferenceJob(
  homeTeam: string,
  awayTeam: string,
  conference: CfbConferenceSlug,
): boolean {
  return isCfbPipelineConferenceGame(homeTeam, awayTeam, conference);
}

export async function collectExpectedGameIdsForJob(
  season: number,
  conference: CfbConferenceSlug,
): Promise<string[]> {
  const spec = resolveConferenceSpec(conference);
  const teamSet = new Set(spec.teamAbbrs.map((abbr) => abbr.toUpperCase()));
  const ids = new Set<string>();

  for (const abbr of CFB_TEAM_ABBRS) {
    if (!teamSet.has(abbr.toUpperCase())) continue;
    const teamId = CFB_ESPN_TEAM_IDS[abbr];
    if (!teamId) continue;

    for (const seasonType of [2, 3] as const) {
      await sleep(40);
      try {
        const events = await fetchTeamSchedule(teamId, season, seasonType);
        for (const ev of events) {
          if (!isCfbPipelineConferenceGame(ev.homeAbbr, ev.awayAbbr, conference)) continue;
          ids.add(ev.eventId);
        }
      } catch {
        // Schedule fetch failures surface as missing ids in the integrity report.
      }
    }
  }

  return [...ids].sort();
}

export function loadIngestedGameIds(
  gameLogs: CfbGameLogEntry[],
  season: number,
  conference: CfbConferenceSlug,
): string[] {
  const seasonLabel = `${season}-${String((season + 1) % 100).padStart(2, "0")}`;
  return gameLogs
    .filter(
      (game) =>
        game.season === seasonLabel &&
        gameBelongsToConferenceJob(game.homeTeam, game.awayTeam, conference),
    )
    .map((game) => game.gameId)
    .sort();
}

export function compareGameIdSets(expected: string[], ingested: string[]): {
  missingGameIds: string[];
  extraGameIds: string[];
} {
  const expectedSet = new Set(expected);
  const ingestedSet = new Set(ingested);
  const missingGameIds = expected.filter((id) => !ingestedSet.has(id));
  const extraGameIds = ingested.filter((id) => !expectedSet.has(id));
  return { missingGameIds, extraGameIds };
}

export async function runIntegrityCheckForJob(input: {
  job: CfbPipelineJob;
  gameLogs: CfbGameLogEntry[];
}): Promise<CfbMissingDataReport["checks"][number]> {
  const expected = await collectExpectedGameIdsForJob(input.job.season, input.job.conference);
  const ingested = loadIngestedGameIds(
    input.gameLogs,
    input.job.season,
    input.job.conference,
  );
  const { missingGameIds, extraGameIds } = compareGameIdSets(expected, ingested);

  return {
    jobId: input.job.id,
    season: input.job.season,
    conference: input.job.conference,
    expectedCount: expected.length,
    ingestedCount: ingested.length,
    missingGameIds,
    extraGameIds,
  };
}

export function writeMissingDataReport(
  reportPath: string,
  checks: CfbMissingDataReport["checks"],
): CfbMissingDataReport {
  const report: CfbMissingDataReport = {
    generatedAt: new Date().toISOString(),
    checks,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export function loadGameLogs(filePath: string): CfbGameLogEntry[] {
  if (!fs.existsSync(filePath)) return [];
  const body = JSON.parse(fs.readFileSync(filePath, "utf8")) as { games?: CfbGameLogEntry[] };
  return body.games ?? [];
}
