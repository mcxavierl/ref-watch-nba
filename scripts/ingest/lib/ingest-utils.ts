import {
  classifyFoulName,
  FoulCategory,
  type FoulClassificationLeague,
} from "../../../src/lib/types/foul-categories";
import {
  classifyFoulForLeague,
  processFoulData as processLeagueFoulData,
  tagIngestFoul,
  type IngestFoulRecord,
  type TaggedIngestFoul,
} from "../../lib/process-foul-data";

export type { IngestFoulRecord, TaggedIngestFoul };
export { classifyFoulName, FoulCategory };

const NBA_LEAGUE: FoulClassificationLeague = "nba";

/** Optional foul list carried on NBA NDJSON game-log or foul shard rows. */
export type NbaFoulGameShardEntry = {
  gameId: string;
  season: string;
  fouls?: IngestFoulRecord[];
};

/** Classify an NBA foul label using the shared foul taxonomy. */
export function classifyFoul(foulName: string): FoulCategory {
  return classifyFoulForLeague(NBA_LEAGUE, foulName);
}

/**
 * Tag each foul with category during ingest parsing.
 * Unknown labels default to SUBJECTIVE (via classifyFoulName) with a console.warn.
 */
export function processFoulData<T extends IngestFoulRecord>(
  fouls: readonly T[],
): Array<T | TaggedIngestFoul<T>> {
  return processLeagueFoulData(NBA_LEAGUE, fouls);
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

/** Tag one parsed foul row during NBA ingest parsing. */
export function tagNbaIngestFoul<T extends IngestFoulRecord>(
  foul: T,
): T | TaggedIngestFoul<T> {
  return tagIngestFoul(NBA_LEAGUE, foul);
}
