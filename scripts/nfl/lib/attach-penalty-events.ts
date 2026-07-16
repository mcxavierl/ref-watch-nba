import * as fs from "node:fs";
import * as path from "node:path";
import {
  estimateGameLeverageFromFlagTotals,
} from "../../../src/lib/impact-calculator";
import { classifyNflPenaltySlug } from "../../../src/config/penalty-types";
import type { NflPenaltyEvent } from "../../../src/lib/types";
import {
  loadCachedPenaltyEventIndex,
  summarizePenaltyEvents,
} from "./nflverse-penalty-events";
import { nflverseMatchupKey } from "./nflverse-lines";

type GameLogEntry = {
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeFlags?: number;
  awayFlags?: number;
  penaltyEvents?: NflPenaltyEvent[];
  highLeverageImpact?: number;
  highLeverageFlagRate?: number;
  subjectiveFlags?: number;
  administrativeFlags?: number;
};

type GameLogFile = {
  lastUpdated: string;
  league: "NFL";
  source: string;
  games: GameLogEntry[];
};

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current);
  return fields;
}

function buildNflverseLookups(gamesCsv: string): {
  byEspn: Map<string, string>;
  byMatchup: Map<string, string>;
} {
  const rows = gamesCsv.trim().split("\n");
  const header = parseCsvRow(rows[0] ?? "");
  const idx = (name: string) => header.indexOf(name);
  const gameIdI = idx("game_id");
  const espnI = idx("espn");
  const dateI = idx("gameday");
  const awayI = idx("away_team");
  const homeI = idx("home_team");

  const byEspn = new Map<string, string>();
  const byMatchup = new Map<string, string>();

  for (let r = 1; r < rows.length; r++) {
    const fields = parseCsvRow(rows[r] ?? "");
    const gameId = fields[gameIdI]?.trim();
    const espn = fields[espnI]?.trim();
    const date = fields[dateI]?.trim();
    const away = fields[awayI]?.trim();
    const home = fields[homeI]?.trim();
    if (!gameId) continue;
    if (espn && espn !== "NA") byEspn.set(espn, gameId);
    if (date && away && home) {
      byMatchup.set(nflverseMatchupKey(date, away, home), gameId);
    }
  }

  return { byEspn, byMatchup };
}

function lookupEvents(
  game: GameLogEntry,
  eventsByGameId: Record<string, NflPenaltyEvent[]>,
  byEspn: Map<string, string>,
  byMatchup: Map<string, string>,
): NflPenaltyEvent[] | undefined {
  const direct = eventsByGameId[game.gameId];
  if (direct?.length) return direct;

  const mappedEspn = byEspn.get(String(game.gameId));
  if (mappedEspn && eventsByGameId[mappedEspn]?.length) {
    return eventsByGameId[mappedEspn];
  }

  const mappedMatchup = byMatchup.get(
    nflverseMatchupKey(game.date, game.awayTeam, game.homeTeam),
  );
  if (mappedMatchup && eventsByGameId[mappedMatchup]?.length) {
    return eventsByGameId[mappedMatchup];
  }

  return undefined;
}

function dispositionFromEvents(events: NflPenaltyEvent[]): {
  subjectiveFlags: number;
  administrativeFlags: number;
} {
  let subjectiveFlags = 0;
  let administrativeFlags = 0;
  for (const event of events) {
    if (!event.accepted) continue;
    if (classifyNflPenaltySlug(event.type) === "administrative") {
      administrativeFlags += 1;
    } else {
      subjectiveFlags += 1;
    }
  }
  return { subjectiveFlags, administrativeFlags };
}

/** Enrich game rows with play-level penalty events (in-memory). */
export function enrichGameLogsWithPenaltyEvents<T extends GameLogEntry>(
  games: T[],
  dataDir: string,
): { games: T[]; applied: number } {
  const events = loadCachedPenaltyEventIndex(dataDir, { writeCache: true });
  if (!events) return { games, applied: 0 };

  const gamesCsvPath = path.join(dataDir, "nflverse-games.csv");
  const { byEspn, byMatchup } = fs.existsSync(gamesCsvPath)
    ? buildNflverseLookups(fs.readFileSync(gamesCsvPath, "utf8"))
    : { byEspn: new Map<string, string>(), byMatchup: new Map<string, string>() };

  let applied = 0;
  const enriched = games.map((game) => {
    const penaltyEvents = lookupEvents(game, events, byEspn, byMatchup);
    if (!penaltyEvents?.length) {
      const estimated = estimateGameLeverageFromFlagTotals(
        game.homeFlags,
        game.awayFlags,
      );
      if (estimated <= 0) return game;
      return { ...game, highLeverageImpact: estimated };
    }

    applied += 1;
    const summary = summarizePenaltyEvents(penaltyEvents);
    const disposition = dispositionFromEvents(penaltyEvents);
    return {
      ...game,
      penaltyEvents,
      highLeverageImpact: summary.highLeverageImpact,
      highLeverageFlagRate: summary.highLeverageFlagRate,
      subjectiveFlags: disposition.subjectiveFlags,
      administrativeFlags: disposition.administrativeFlags,
    };
  });

  return { games: enriched, applied };
}

/** Drop play-level penalty arrays after leverage summaries are computed. */
export function compactGameLogPenaltyPayload<T extends GameLogEntry>(
  games: T[],
): T[] {
  return games.map((game) => {
    if (!game.penaltyEvents?.length) return game;
    const { penaltyEvents: _removed, ...rest } = game;
    return rest as T;
  });
}

/** Attach play-level penalty events and leverage summaries to NFL game logs. */
export function attachPenaltyEventsToGameLogs(
  dataDir: string,
  options: { compact?: boolean } = {},
): { applied: number; total: number } {
  const logPath = path.join(dataDir, "game-logs.json");
  if (!fs.existsSync(logPath)) return { applied: 0, total: 0 };

  const file = JSON.parse(fs.readFileSync(logPath, "utf8")) as GameLogFile;
  const { games, applied } = enrichGameLogsWithPenaltyEvents(file.games, dataDir);
  const outputGames = options.compact
    ? compactGameLogPenaltyPayload(games)
    : games;

  fs.writeFileSync(
    logPath,
    `${JSON.stringify({ ...file, lastUpdated: new Date().toISOString(), games: outputGames }, null, 2)}\n`,
  );

  return { applied, total: games.length };
}
