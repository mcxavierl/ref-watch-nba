import { z } from "zod";
import {
  classifyNflPenaltySlug,
  type PenaltyDisposition,
} from "@/config/penalty-types";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import { refSlug } from "@/lib/ref-slug";
import type { RefOfficial } from "@/lib/types";

/** Indexed columns for foul_events retrieval (crew synergy, matrix joins). */
export const FOUL_EVENTS_INDEXES = ["crew_id", "official_id", "game_id"] as const;

export type FoulEventIndex = (typeof FOUL_EVENTS_INDEXES)[number];

export const foulEventRecordSchema = z.object({
  event_id: z.string().min(1),
  game_id: z.string().min(1),
  /** Whistle-blower official slug (stable ref id). */
  official_id: z.string().min(1),
  /** Sorted pipe-delimited trio identifier for that night's crew. */
  crew_id: z.string().min(1),
  category: z.string().min(1),
  disposition: z.enum(["subjective", "administrative"]),
  game_timestamp: z.string().min(1),
  league: z.string().min(1),
});

export type FoulEventRecord = z.infer<typeof foulEventRecordSchema>;

/** Build the canonical crew_id for a specific night's officiating trio. */
export function crewIdFromOfficials(officials: Pick<RefOfficial, "name" | "number">[]): string {
  return officials
    .map((official) => refSlug(official.name, official.number))
    .sort()
    .join("|");
}

function toGameTimestamp(date: string): string {
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return new Date().toISOString();
  return new Date(parsed).toISOString();
}

function eventId(
  gameId: string,
  officialId: string,
  category: string,
  index: number,
): string {
  return `${gameId}:${officialId}:${category}:${index}`;
}

/** Expand a game log into normalized foul_events rows with crew_id indexed identity. */
export function expandGameToFoulEvents(
  game: RuntimeGameLogEntry,
  leagueId: LeagueId,
): FoulEventRecord[] {
  if (game.officials.length === 0) return [];

  const crewId = crewIdFromOfficials(game.officials);
  const gameTimestamp = toGameTimestamp(game.date);
  const records: FoulEventRecord[] = [];
  let index = 0;

  const pushEvent = (
    officialId: string,
    category: string,
    disposition: PenaltyDisposition,
  ) => {
    records.push({
      event_id: eventId(game.gameId, officialId, category, index++),
      game_id: game.gameId,
      official_id: officialId,
      crew_id: crewId,
      category,
      disposition,
      game_timestamp: gameTimestamp,
      league: leagueId,
    });
  };

  if (leagueId === "nfl" && game.penaltyEvents?.length) {
    for (const penalty of game.penaltyEvents) {
      const disposition = classifyNflPenaltySlug(penalty.type);
      for (const official of game.officials) {
        pushEvent(refSlug(official.name, official.number), penalty.type, disposition);
      }
    }
    return records;
  }

  for (const official of game.officials) {
    const officialId = refSlug(official.name, official.number);
    pushEvent(officialId, "game-officiating", "subjective");
    pushEvent(officialId, "game-officiating", "administrative");
  }

  return records;
}

/** Group foul_events by crew_id for indexed crew-level aggregation. */
export function indexFoulEventsByCrewId(
  events: FoulEventRecord[],
): Map<string, FoulEventRecord[]> {
  const byCrew = new Map<string, FoulEventRecord[]>();
  for (const event of events) {
    const bucket = byCrew.get(event.crew_id) ?? [];
    bucket.push(event);
    byCrew.set(event.crew_id, bucket);
  }
  return byCrew;
}

export function validateFoulEvents(records: unknown[]): {
  valid: FoulEventRecord[];
  invalid: Array<{ index: number; issues: string[] }>;
} {
  const valid: FoulEventRecord[] = [];
  const invalid: Array<{ index: number; issues: string[] }> = [];

  records.forEach((record, index) => {
    const parsed = foulEventRecordSchema.safeParse(record);
    if (parsed.success) {
      valid.push(parsed.data);
      return;
    }
    invalid.push({
      index,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    });
  });

  return { valid, invalid };
}
