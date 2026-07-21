import {
  classifyFoulName,
  FoulCategory,
} from "../../../src/lib/types/foul-categories";

/** Minimal foul shape accepted by NBA ingest enrichment. */
export type IngestFoulRecord = {
  foulName?: string;
  rawType?: string;
  type?: string;
  category?: FoulCategory;
};

export type TaggedIngestFoul<T extends IngestFoulRecord> = T & {
  category?: FoulCategory;
};

/** Optional foul list carried on NBA NDJSON game-log or foul shard rows. */
export type NbaFoulGameShardEntry = {
  gameId: string;
  season: string;
  fouls?: IngestFoulRecord[];
};

function resolveFoulName(foul: IngestFoulRecord): string {
  return (foul.foulName ?? foul.rawType ?? foul.type ?? "").trim();
}

/** Classify an NBA foul label using the shared foul taxonomy. */
export function classifyFoul(foulName: string): FoulCategory {
  return classifyFoulName("nba", foulName);
}

/**
 * Tag each foul with an optional category before shard writes.
 * Existing records without a resolvable name are returned unchanged.
 */
export function processFoulData<T extends IngestFoulRecord>(
  fouls: readonly T[],
): TaggedIngestFoul<T>[] {
  return fouls.map((foul) => {
    const foulName = resolveFoulName(foul);
    if (!foulName) return { ...foul };
    return {
      ...foul,
      category: classifyFoul(foulName),
    };
  });
}

/** Enrich one NBA game shard row that may carry a nested foul list. */
export function processNbaFoulShardEntry<T extends NbaFoulGameShardEntry>(
  entry: T,
): T {
  if (!entry.fouls?.length) return entry;
  return {
    ...entry,
    fouls: processFoulData(entry.fouls),
  };
}
