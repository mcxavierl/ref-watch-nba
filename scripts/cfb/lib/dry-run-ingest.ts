import * as fs from "node:fs";
import * as path from "node:path";
import type { RefGameRecord, RefStatsFile } from "../../../src/lib/types";
import {
  isGameInConference,
  resolveConferenceSpec,
  type CfbConferenceSpec,
} from "./conferences";
import type { CfbExtractedGame, CfbExtractedGamesFile } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "cfb");
const STAGING_DIR = path.join(DATA_DIR, "staging");

function stagingPathForSlug(slug: string): string {
  return path.join(STAGING_DIR, slug, "extracted-games.json");
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function gameFromRefRecord(
  record: RefGameRecord,
  spec: CfbConferenceSpec,
  officials?: CfbExtractedGame["officials"],
): CfbExtractedGame {
  return {
    gameId: record.gameId,
    date: record.date,
    season: record.season,
    homeTeam: record.homeTeam,
    awayTeam: record.awayTeam,
    conference: spec.label,
    totalPoints: record.totalPoints,
    totalFouls: record.totalFouls,
    officials,
  };
}

function deriveFromRefStats(spec: CfbConferenceSpec): {
  games: CfbExtractedGame[];
  ingestedCount: number;
} {
  const refStatsPath = path.join(DATA_DIR, "ref-stats.json");
  const refStats = readJsonFile<RefStatsFile>(refStatsPath);
  if (!refStats) return { games: [], ingestedCount: 0 };

  const byId = new Map<string, CfbExtractedGame>();

  for (const ref of refStats.refs) {
    const officials = [{ name: ref.name, number: ref.number }];
    for (const record of ref.recentGames ?? []) {
      const candidate = gameFromRefRecord(record, spec, officials);
      if (!isGameInConference(candidate, spec)) continue;
      if (!byId.has(candidate.gameId)) {
        byId.set(candidate.gameId, candidate);
      }
    }
  }

  const games = [...byId.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
  );

  const ingestedCount =
    typeof refStats.meta.totalGamesProcessed === "number" &&
    refStats.meta.totalGamesProcessed > 0 &&
    games.length > 0
      ? refStats.meta.totalGamesProcessed
      : games.length;

  return { games, ingestedCount };
}

function normalizeStagingFile(
  raw: CfbExtractedGamesFile,
  spec: CfbConferenceSpec,
): CfbExtractedGamesFile {
  const games = (raw.games ?? [])
    .filter((game) => isGameInConference(game, spec))
    .map((game) => ({
      ...game,
      conference: spec.label,
    }));

  return {
    ...raw,
    conference: spec.label,
    conferenceSlug: spec.slug,
    dryRun: true,
    games,
    ingestedCount: raw.ingestedCount ?? games.length,
    expectedGames: raw.expectedGames,
  };
}

/**
 * Dry-run conference ingest — reads staging artifacts or derives from committed
 * ref-stats without writing production data files.
 */
export function dryRunConferenceIngest(slug: string): CfbExtractedGamesFile {
  const spec = resolveConferenceSpec(slug);
  const stagingPath = stagingPathForSlug(spec.slug);
  const staged = readJsonFile<CfbExtractedGamesFile>(stagingPath);

  if (staged && Array.isArray(staged.games) && staged.games.length > 0) {
    return normalizeStagingFile(staged, spec);
  }

  const derived = deriveFromRefStats(spec);
  return {
    generatedAt: new Date().toISOString(),
    conference: spec.label,
    conferenceSlug: spec.slug,
    dryRun: true,
    games: derived.games,
    ingestedCount: derived.ingestedCount,
  };
}
