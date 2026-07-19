import * as fs from "node:fs";
import * as path from "node:path";
import { classifyFoulName } from "@/lib/types/foul-categories";
import { allowNodeDataFs } from "@/lib/production-data-guard";
import type { NflPenaltyEvent } from "@/lib/types";

type PenaltyEventIndex = Record<string, NflPenaltyEvent[]>;

let cachedIndex: PenaltyEventIndex | null | undefined;
let lookupReady = false;
let byEspn = new Map<string, string>();
let byMatchup = new Map<string, string>();

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

function matchupKey(date: string, away: string, home: string): string {
  return `${date}|${away}|${home}`;
}

function ensureLookups(): void {
  if (lookupReady) return;
  lookupReady = true;

  if (!allowNodeDataFs()) return;

  const gamesCsvPath = path.join(process.cwd(), "data/nfl/nflverse-games.csv");
  if (!fs.existsSync(gamesCsvPath)) return;

  const rows = fs.readFileSync(gamesCsvPath, "utf8").trim().split("\n");
  const header = parseCsvRow(rows[0] ?? "");
  const idx = (name: string) => header.indexOf(name);
  const gameIdI = idx("game_id");
  const espnI = idx("espn");
  const dateI = idx("gameday");
  const awayI = idx("away_team");
  const homeI = idx("home_team");

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
      byMatchup.set(matchupKey(date, away, home), gameId);
    }
  }
}

function loadPenaltyEventIndex(): PenaltyEventIndex | null {
  if (!allowNodeDataFs()) return null;
  if (cachedIndex !== undefined) return cachedIndex;

  try {
    const cachePath = path.join(process.cwd(), "data/nfl/penalty-events-by-game.json");
    cachedIndex = JSON.parse(fs.readFileSync(cachePath, "utf8")) as PenaltyEventIndex;
  } catch {
    cachedIndex = null;
  }

  return cachedIndex;
}

function withCategoryTags(events: NflPenaltyEvent[]): NflPenaltyEvent[] {
  return events.map((event) => ({
    ...event,
    category:
      event.category ?? classifyFoulName("nfl", event.rawType || event.type),
  }));
}

export function lookupNflPenaltyEventsForGame(game: {
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  penaltyEvents?: NflPenaltyEvent[];
}): NflPenaltyEvent[] {
  if (game.penaltyEvents?.length) {
    return withCategoryTags(game.penaltyEvents);
  }

  const index = loadPenaltyEventIndex();
  if (!index) return [];

  const direct = index[game.gameId];
  if (direct?.length) return withCategoryTags(direct);

  ensureLookups();

  const espnMapped = byEspn.get(String(game.gameId));
  if (espnMapped && index[espnMapped]?.length) {
    return withCategoryTags(index[espnMapped]);
  }

  const mappedMatchup = byMatchup.get(
    matchupKey(game.date, game.awayTeam, game.homeTeam),
  );
  if (mappedMatchup && index[mappedMatchup]?.length) {
    return withCategoryTags(index[mappedMatchup]);
  }

  return [];
}
