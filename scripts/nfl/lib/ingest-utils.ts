import type { NflPenaltyEvent } from "../../../src/lib/types";
import {
  classifyFoulName,
  FoulCategory,
} from "../../../src/lib/types/foul-categories";

/** Minimal foul shape accepted by NFL ingest enrichment. */
export type IngestFoulRecord = {
  foulName?: string;
  rawType?: string;
  type?: string;
  category?: FoulCategory;
};

export type TaggedIngestFoul<T extends IngestFoulRecord> = T & {
  category?: FoulCategory;
};

function resolveFoulName(foul: IngestFoulRecord): string {
  return (foul.foulName ?? foul.rawType ?? foul.type ?? "").trim();
}

/** Classify an NFL penalty label using the shared foul taxonomy. */
export function classifyFoul(foulName: string): FoulCategory {
  return classifyFoulName("nfl", foulName);
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

/** Tag one NFL penalty event for play-level caches and game-log shards. */
export function tagNflPenaltyEvent(event: NflPenaltyEvent): NflPenaltyEvent {
  const [tagged] = processFoulData([event]);
  return tagged;
}

/** Tag penalty arrays attached to NFL game-log shard rows. */
export function tagNflPenaltyEvents(
  events: readonly NflPenaltyEvent[],
): NflPenaltyEvent[] {
  return processFoulData(events);
}
