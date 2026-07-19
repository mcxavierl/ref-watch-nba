import * as fs from "node:fs";
import * as path from "node:path";
import {
  classifyFoulName,
  FoulCategory,
  type FoulClassificationLeague,
} from "../../../src/lib/types/foul-categories";

export type BackfillFoulRecord = {
  foulName?: string;
  rawType?: string;
  type?: string;
  category?: FoulCategory;
};

export type BackfillGameLogRow = Record<string, unknown> & {
  penaltyEvents?: BackfillFoulRecord[];
  fouls?: BackfillFoulRecord[];
};

export type BackfillShardStats = {
  shardPath: string;
  league: FoulClassificationLeague | null;
  gamesScanned: number;
  gamesModified: number;
  foulEntriesScanned: number;
  foulEntriesTagged: number;
  foulEntriesAlreadyTagged: number;
  skippedUnsupportedLeague: boolean;
};

export type BackfillRunOptions = {
  root?: string;
  shardPaths: string[];
  dryRun: boolean;
};

export type BackfillRunReport = {
  dryRun: boolean;
  shardsProcessed: number;
  totals: Omit<BackfillShardStats, "shardPath" | "league" | "skippedUnsupportedLeague">;
  shards: BackfillShardStats[];
};

function resolveFoulName(foul: BackfillFoulRecord): string {
  return (foul.foulName ?? foul.rawType ?? foul.type ?? "").trim();
}

/** Tag one foul row when category is missing. Existing tags are preserved. */
export function backfillFoulRecord(
  league: FoulClassificationLeague,
  foul: BackfillFoulRecord,
): { foul: BackfillFoulRecord; tagged: boolean } {
  if (foul.category) {
    return { foul, tagged: false };
  }

  const foulName = resolveFoulName(foul);
  if (!foulName) {
    return { foul, tagged: false };
  }

  return {
    foul: {
      ...foul,
      category: classifyFoulName(league, foulName),
    },
    tagged: true,
  };
}

function backfillFoulArray(
  league: FoulClassificationLeague,
  fouls: BackfillFoulRecord[],
): {
  fouls: BackfillFoulRecord[];
  modified: boolean;
  scanned: number;
  tagged: number;
  alreadyTagged: number;
} {
  let modified = false;
  let tagged = 0;
  let alreadyTagged = 0;

  const next = fouls.map((foul) => {
    if (foul.category) {
      alreadyTagged++;
      return foul;
    }
    const result = backfillFoulRecord(league, foul);
    if (result.tagged) {
      modified = true;
      tagged++;
      return result.foul;
    }
    return foul;
  });

  return {
    fouls: modified ? next : fouls,
    modified,
    scanned: fouls.length,
    tagged,
    alreadyTagged,
  };
}

/** Backfill missing categories on one game-log row. */
export function backfillGameLogRow(
  league: FoulClassificationLeague,
  game: BackfillGameLogRow,
): {
  game: BackfillGameLogRow;
  modified: boolean;
  foulEntriesScanned: number;
  foulEntriesTagged: number;
  foulEntriesAlreadyTagged: number;
} {
  let modified = false;
  let foulEntriesScanned = 0;
  let foulEntriesTagged = 0;
  let foulEntriesAlreadyTagged = 0;
  const next: BackfillGameLogRow = { ...game };

  if (Array.isArray(game.penaltyEvents) && game.penaltyEvents.length > 0) {
    const result = backfillFoulArray(league, game.penaltyEvents);
    foulEntriesScanned += result.scanned;
    foulEntriesTagged += result.tagged;
    foulEntriesAlreadyTagged += result.alreadyTagged;
    if (result.modified) {
      modified = true;
      next.penaltyEvents = result.fouls;
    }
  }

  if (Array.isArray(game.fouls) && game.fouls.length > 0) {
    const result = backfillFoulArray(league, game.fouls);
    foulEntriesScanned += result.scanned;
    foulEntriesTagged += result.tagged;
    foulEntriesAlreadyTagged += result.alreadyTagged;
    if (result.modified) {
      modified = true;
      next.fouls = result.fouls;
    }
  }

  return {
    game: modified ? next : game,
    modified,
    foulEntriesScanned,
    foulEntriesTagged,
    foulEntriesAlreadyTagged,
  };
}

export function leagueFromShardPath(
  shardPath: string,
  root = process.cwd(),
): FoulClassificationLeague | null {
  const rel = path.relative(path.join(root, "data"), shardPath);
  const leagueSlug = rel.split(path.sep)[0]?.toLowerCase();
  if (leagueSlug === "nba" || leagueSlug === "nfl") {
    return leagueSlug;
  }
  return null;
}

export function discoverGameLogShards(root = process.cwd()): string[] {
  const dataDir = path.join(root, "data");
  if (!fs.existsSync(dataDir)) return [];

  const shards: string[] = [];
  for (const leagueDir of fs.readdirSync(dataDir)) {
    const shardDir = path.join(dataDir, leagueDir, "game-logs");
    if (!fs.existsSync(shardDir) || !fs.statSync(shardDir).isDirectory()) {
      continue;
    }
    for (const file of fs.readdirSync(shardDir)) {
      if (file.endsWith(".ndjson")) {
        shards.push(path.join(shardDir, file));
      }
    }
  }

  return shards.sort();
}

export function backfillGameLogShard(options: {
  shardPath: string;
  root?: string;
  dryRun: boolean;
}): BackfillShardStats {
  const root = options.root ?? process.cwd();
  const league = leagueFromShardPath(options.shardPath, root);
  const content = fs.readFileSync(options.shardPath, "utf8");
  const rawLines = content.split("\n");
  const lines = rawLines.filter((line) => line.trim().length > 0);

  const stats: BackfillShardStats = {
    shardPath: options.shardPath,
    league,
    gamesScanned: 0,
    gamesModified: 0,
    foulEntriesScanned: 0,
    foulEntriesTagged: 0,
    foulEntriesAlreadyTagged: 0,
    skippedUnsupportedLeague: league === null,
  };

  if (!league) {
    return stats;
  }

  const outLines: string[] = [];
  for (const line of lines) {
    stats.gamesScanned++;
    const game = JSON.parse(line) as BackfillGameLogRow;
    const result = backfillGameLogRow(league, game);
    stats.foulEntriesScanned += result.foulEntriesScanned;
    stats.foulEntriesTagged += result.foulEntriesTagged;
    stats.foulEntriesAlreadyTagged += result.foulEntriesAlreadyTagged;

    if (result.modified) {
      stats.gamesModified++;
      outLines.push(JSON.stringify(result.game));
    } else {
      outLines.push(line);
    }
  }

  if (!options.dryRun && stats.gamesModified > 0) {
    const payload = outLines.length > 0 ? `${outLines.join("\n")}\n` : "";
    fs.writeFileSync(options.shardPath, payload, "utf8");
  }

  return stats;
}

export function runFoulCategoryBackfill(
  options: BackfillRunOptions,
): BackfillRunReport {
  const root = options.root ?? process.cwd();
  const shards = options.shardPaths.map((shardPath) =>
    path.isAbsolute(shardPath) ? shardPath : path.join(root, shardPath),
  );

  const report: BackfillRunReport = {
    dryRun: options.dryRun,
    shardsProcessed: 0,
    totals: {
      gamesScanned: 0,
      gamesModified: 0,
      foulEntriesScanned: 0,
      foulEntriesTagged: 0,
      foulEntriesAlreadyTagged: 0,
    },
    shards: [],
  };

  for (const shardPath of shards) {
    if (!fs.existsSync(shardPath)) {
      throw new Error(`Shard not found: ${shardPath}`);
    }

    const shardStats = backfillGameLogShard({
      shardPath,
      root,
      dryRun: options.dryRun,
    });
    report.shardsProcessed++;
    report.shards.push(shardStats);
    report.totals.gamesScanned += shardStats.gamesScanned;
    report.totals.gamesModified += shardStats.gamesModified;
    report.totals.foulEntriesScanned += shardStats.foulEntriesScanned;
    report.totals.foulEntriesTagged += shardStats.foulEntriesTagged;
    report.totals.foulEntriesAlreadyTagged += shardStats.foulEntriesAlreadyTagged;
  }

  return report;
}
