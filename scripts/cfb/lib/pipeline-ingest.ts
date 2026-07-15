import * as fs from "node:fs";
import * as path from "node:path";
import { CFB_TEAM_ABBRS } from "../../../src/lib/cfb/teams";
import {
  resolveGameConferenceTerritory,
  shouldIngestNcaaGame,
} from "../../../src/lib/ncaa-conference-gate";
import type { RefStatsFile } from "../../../src/lib/types";
import { resolveConferenceSpec, type CfbConferenceSlug } from "./conferences";
import {
  fetchCfbSummary,
  fetchTeamSchedule,
  normalizeName,
  sleep,
  toCfbOfficials,
} from "./espn";
import { fetchOfficialsFromSummary } from "./fetch-officials";
import { CFB_ESPN_TEAM_IDS } from "./team-ids";
import { createIngestLogWriter, logOfficialsMissing } from "./ingest-log";
import {
  buildRefStatsFromGames,
  gameLogFromSummary,
  summaryToExtractedGame,
  type CfbGameLogEntry,
} from "./transform";
import type { CfbExtractedGame, CfbExtractedGamesFile } from "./types";
import type { CfbPipelinePartialProgress } from "./pipeline-types";

const CONF_LABEL_TO_SLUG: Record<string, CfbConferenceSlug> = {
  SEC: "sec",
  ACC: "acc",
  "Big Ten": "big-ten",
  "Big 12": "big-12",
};

export type CfbScheduleMeta = {
  season: string;
  awayAbbr: string;
  homeAbbr: string;
};

export type CfbChunkProcessResult = {
  processedThisRun: number;
  nextCursor: number;
  gameLogs: CfbGameLogEntry[];
  extractedGames: CfbExtractedGame[];
  done: boolean;
  fetchErrors: number;
};

export function loadOfficialRoster(seed: RefStatsFile | null): Map<string, number> {
  const roster = new Map<string, number>();
  if (!seed) return roster;
  for (const ref of seed.refs) {
    roster.set(normalizeName(ref.name), ref.number);
  }
  return roster;
}

function gameBelongsToConferenceJob(
  homeTeam: string,
  awayTeam: string,
  conference: CfbConferenceSlug,
): boolean {
  const territory = resolveGameConferenceTerritory("cfb", homeTeam, awayTeam);
  return CONF_LABEL_TO_SLUG[territory] === conference;
}

export async function collectScheduleForJob(
  season: number,
  conference: CfbConferenceSlug,
): Promise<Map<string, CfbScheduleMeta>> {
  const spec = resolveConferenceSpec(conference);
  const teamSet = new Set(spec.teamAbbrs.map((abbr) => abbr.toUpperCase()));
  const byId = new Map<string, CfbScheduleMeta>();

  for (const abbr of CFB_TEAM_ABBRS) {
    if (!teamSet.has(abbr.toUpperCase())) continue;
    const teamId = CFB_ESPN_TEAM_IDS[abbr];
    if (!teamId) continue;

    for (const seasonType of [2, 3] as const) {
      await sleep(50);
      try {
        const events = await fetchTeamSchedule(teamId, season, seasonType);
        for (const ev of events) {
          if (!byId.has(ev.eventId)) {
            if (!shouldIngestNcaaGame("cfb", ev.homeAbbr, ev.awayAbbr)) continue;
            if (!gameBelongsToConferenceJob(ev.homeAbbr, ev.awayAbbr, conference)) continue;
            byId.set(ev.eventId, {
              season: ev.season,
              awayAbbr: ev.awayAbbr,
              homeAbbr: ev.homeAbbr,
            });
          }
        }
      } catch (err) {
        console.warn(`  schedule ${abbr} ${season} t${seasonType}: ${err}`);
      }
    }
  }

  return byId;
}

export async function processGameChunk(input: {
  season: number;
  conference: CfbConferenceSlug;
  schedule: Map<string, CfbScheduleMeta>;
  cursor: number;
  chunkSize: number;
  roster: Map<string, number>;
  skipGameIds?: Set<string>;
}): Promise<CfbChunkProcessResult> {
  const ids = [...input.schedule.keys()];
  const ingestLog = createIngestLogWriter();
  const gameLogs: CfbGameLogEntry[] = [];
  const extractedGames: CfbExtractedGame[] = [];
  const skip = input.skipGameIds ?? new Set<string>();

  let processedThisRun = 0;
  let fetchErrors = 0;
  let cursor = input.cursor;

  while (cursor < ids.length && processedThisRun < input.chunkSize) {
    const eventId = ids[cursor]!;
    cursor++;

    if (skip.has(eventId)) continue;

    const meta = input.schedule.get(eventId)!;
    await sleep(75);

    let summary;
    try {
      summary = await fetchCfbSummary(eventId, meta.season);
    } catch {
      fetchErrors++;
      continue;
    }
    if (!summary) continue;

    const trackedHome = CFB_TEAM_ABBRS.includes(summary.homeAbbr);
    const trackedAway = CFB_TEAM_ABBRS.includes(summary.awayAbbr);
    if (!trackedHome && !trackedAway) continue;

    if (!shouldIngestNcaaGame("cfb", summary.homeAbbr, summary.awayAbbr)) continue;
    if (!gameBelongsToConferenceJob(summary.homeAbbr, summary.awayAbbr, input.conference)) {
      continue;
    }

    const conferenceLabel = resolveGameConferenceTerritory(
      "cfb",
      summary.homeAbbr,
      summary.awayAbbr,
    );

    const fetched = fetchOfficialsFromSummary(summary);
    let officials = toCfbOfficials(summary.officials, input.roster);
    if (fetched.officials.length > 0) {
      officials = toCfbOfficials(
        fetched.officials.map((o) => ({
          fullName: o.name,
          positionName: o.role,
        })),
        input.roster,
      );
    } else {
      logOfficialsMissing(ingestLog, summary.gameId, conferenceLabel);
    }

    gameLogs.push(gameLogFromSummary(summary, officials));
    extractedGames.push(summaryToExtractedGame(summary, fetched.officials));
    processedThisRun++;
  }

  ingestLog.flush();

  return {
    processedThisRun,
    nextCursor: cursor,
    gameLogs,
    extractedGames,
    done: cursor >= ids.length,
    fetchErrors,
  };
}

export function partialProgressPath(stagingDir: string, jobId: string): string {
  return path.join(stagingDir, "partial", `${jobId}.json`);
}

export function loadPartialProgress(
  stagingDir: string,
  jobId: string,
): CfbPipelinePartialProgress | null {
  const filePath = partialProgressPath(stagingDir, jobId);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as CfbPipelinePartialProgress;
}

export function savePartialProgress(
  stagingDir: string,
  progress: CfbPipelinePartialProgress,
): void {
  const filePath = partialProgressPath(stagingDir, progress.jobId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(progress, null, 2)}\n`);
}

export function clearPartialProgress(stagingDir: string, jobId: string): void {
  const filePath = partialProgressPath(stagingDir, jobId);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export function mergeGameLogs(
  existing: CfbGameLogEntry[],
  incoming: CfbGameLogEntry[],
): CfbGameLogEntry[] {
  const byId = new Map(existing.map((game) => [game.gameId, game]));
  for (const game of incoming) {
    byId.set(game.gameId, game);
  }
  return [...byId.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function mergeExtractedGames(
  existing: CfbExtractedGame[],
  incoming: CfbExtractedGame[],
): CfbExtractedGame[] {
  const byId = new Map(existing.map((game) => [game.gameId, game]));
  for (const game of incoming) {
    byId.set(game.gameId, game);
  }
  return [...byId.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function loadExtractedGamesForConference(
  stagingDir: string,
  conference: CfbConferenceSlug,
): CfbExtractedGame[] {
  const filePath = path.join(stagingDir, conference, "extracted-games.json");
  if (!fs.existsSync(filePath)) return [];
  const body = JSON.parse(fs.readFileSync(filePath, "utf8")) as CfbExtractedGamesFile;
  return body.games ?? [];
}

export function writeConferenceStaging(
  stagingDir: string,
  conference: CfbConferenceSlug,
  games: CfbExtractedGame[],
  ingestedCount: number,
): void {
  const spec = resolveConferenceSpec(conference);
  const payload: CfbExtractedGamesFile = {
    generatedAt: new Date().toISOString(),
    conference: spec.label,
    conferenceSlug: spec.slug,
    dryRun: false,
    games,
    ingestedCount,
    expectedGames: spec.expectedGames,
  };
  const dir = path.join(stagingDir, conference);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "extracted-games.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
}

export function writeGameLogsFile(
  dataDir: string,
  games: CfbGameLogEntry[],
): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "game-logs.json"),
    `${JSON.stringify(
      {
        lastUpdated: new Date().toISOString(),
        league: "CFB",
        source: "espn",
        games,
      },
      null,
      2,
    )}\n`,
  );
}

export function writeRefStatsOutputs(
  dataDir: string,
  gameLogs: CfbGameLogEntry[],
  roster: Map<string, number>,
): RefStatsFile {
  const stats = buildRefStatsFromGames({ gameLogs, roster });
  fs.writeFileSync(path.join(dataDir, "ref-stats.json"), `${JSON.stringify(stats, null, 2)}\n`);
  return stats;
}

export function loadExistingGameLogs(dataDir: string): CfbGameLogEntry[] {
  const filePath = path.join(dataDir, "game-logs.json");
  if (!fs.existsSync(filePath)) return [];
  const body = JSON.parse(fs.readFileSync(filePath, "utf8")) as { games?: CfbGameLogEntry[] };
  return body.games ?? [];
}

export function loadSeedStats(dataDir: string): RefStatsFile | null {
  const statsPath = path.join(dataDir, "ref-stats.json");
  if (!fs.existsSync(statsPath)) return null;
  return JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;
}
