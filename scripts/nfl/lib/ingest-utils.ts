import type { NflPenaltyEvent } from "../../../src/lib/types";
import {
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

const NFL_LEAGUE: FoulClassificationLeague = "nfl";

/** Classify an NFL penalty label using the shared foul taxonomy. */
export function classifyFoul(foulName: string): FoulCategory {
  return classifyFoulForLeague(NFL_LEAGUE, foulName);
}

/** Tag each foul with category before shard writes. */
export function processFoulData<T extends IngestFoulRecord>(
  fouls: readonly T[],
): Array<T | TaggedIngestFoul<T>> {
  return processLeagueFoulData(NFL_LEAGUE, fouls);
}

/** Foul row after ingest enrichment (category required when a name is present). */
export type TaggedNflPenaltyEvent = NflPenaltyEvent & {
  category: FoulCategory;
};

/** Tag one NFL penalty event for play-level caches and game-log shards. */
export function tagNflPenaltyEvent(event: NflPenaltyEvent): TaggedNflPenaltyEvent {
  const tagged = tagIngestFoul(NFL_LEAGUE, event);
  return tagged as TaggedNflPenaltyEvent;
}

/** Tag penalty arrays attached to NFL game-log shard rows. */
export function tagNflPenaltyEvents(
  events: readonly NflPenaltyEvent[],
): TaggedNflPenaltyEvent[] {
  return processFoulData(events) as TaggedNflPenaltyEvent[];
}
