#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import type {
  AssignmentGame,
  AssignmentsFile,
  RefOfficial,
  RefRole,
} from "../../src/lib/types";
import { postAssignmentIngest } from "../lib/post-assignment-ingest";

const outPath = path.join(process.cwd(), "data", "nhl", "assignments.json");

interface NhlOfficialRecord {
  firstName: string;
  lastName: string;
  sweaterNumber: number;
  officialType: string;
}

interface ScheduleTeam {
  abbrev: string;
  placeName?: { default: string };
  commonName?: { default: string };
}

interface ScheduleGame {
  id: number;
  gameState: string;
  gameType: number;
  awayTeam: ScheduleTeam;
  homeTeam: ScheduleTeam;
}

interface ScheduleDay {
  date: string;
  games: ScheduleGame[];
}

interface ScheduleResponse {
  gameWeek: ScheduleDay[];
}

interface RightRailResponse {
  gameInfo?: {
    referees?: { default: string }[];
    linesmen?: { default: string }[];
  };
}

function torontoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim();
}

async function fetchOfficialsMap(): Promise<Map<string, number>> {
  const res = await fetch(
    "https://records.nhl.com/site/api/officials?cayenneExp=active=true",
  );
  if (!res.ok) {
    throw new Error(`Officials API ${res.status}`);
  }
  const body = (await res.json()) as { data: NhlOfficialRecord[] };
  const map = new Map<string, number>();
  for (const official of body.data) {
    const name = `${official.firstName} ${official.lastName}`;
    map.set(normalizeName(name), official.sweaterNumber);
  }
  return map;
}

function lookupNumber(
  name: string,
  officials: Map<string, number>,
): number {
  const key = normalizeName(name);
  const direct = officials.get(key);
  if (direct !== undefined) return direct;

  const parts = key.split(/\s+/);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    for (const [k, num] of officials) {
      if (k.endsWith(` ${last}`) || k.split(" ").pop() === last) {
        return num;
      }
    }
  }

  return 0;
}

async function fetchSchedule(date: string): Promise<ScheduleGame[]> {
  const res = await fetch(`https://api-web.nhle.com/v1/schedule/${date}`);
  if (!res.ok) {
    throw new Error(`Schedule API ${res.status}`);
  }
  const body = (await res.json()) as ScheduleResponse;
  const games: ScheduleGame[] = [];
  for (const day of body.gameWeek ?? []) {
    if (day.date !== date) continue;
    for (const game of day.games ?? []) {
      if (game.gameType !== 2) continue;
      if (!["FUT", "PRE", "LIVE"].includes(game.gameState)) continue;
      games.push(game);
    }
  }
  return games;
}

async function fetchCrew(gameId: number): Promise<RefOfficial[]> {
  const res = await fetch(
    `https://api-web.nhle.com/v1/gamecenter/${gameId}/right-rail`,
  );
  if (!res.ok) {
    throw new Error(`Right-rail ${gameId}: ${res.status}`);
  }
  const body = (await res.json()) as RightRailResponse;
  const info = body.gameInfo;
  if (!info) return [];

  const officials: RefOfficial[] = [];
  for (const ref of info.referees ?? []) {
    officials.push({
      name: ref.default,
      number: 0,
      role: "referee" as RefRole,
    });
  }
  for (const lines of info.linesmen ?? []) {
    officials.push({
      name: lines.default,
      number: 0,
      role: "linesman" as RefRole,
    });
  }
  return officials;
}

function teamLabel(team: ScheduleTeam): string {
  const city = team.placeName?.default ?? team.abbrev;
  const name = team.commonName?.default ?? "";
  return `${city} ${name}`.trim();
}

async function main() {
  const date = torontoDate();
  console.log(`Fetching NHL schedule for ${date} (America/Toronto)...`);

  const officials = await fetchOfficialsMap();
  const scheduled = await fetchSchedule(date);
  const games: AssignmentGame[] = [];

  for (const game of scheduled) {
    let crew = await fetchCrew(game.id);
    if (crew.length === 0) continue;

    crew = crew.map((o) => ({
      ...o,
      number: lookupNumber(o.name, officials),
    }));

    const away = teamLabel(game.awayTeam);
    const home = teamLabel(game.homeTeam);
    games.push({
      id: String(game.id),
      matchup: `${away} @ ${home}`,
      awayTeam: away,
      homeTeam: home,
      league: "NHL",
      crew,
    });
  }

  const data: AssignmentsFile = {
    lastUpdated: new Date().toISOString(),
    date,
    source: games.length > 0 ? "api-web.nhle.com" : "seeded",
    games,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(
    `Wrote ${games.length} NHL game(s) to ${outPath} (${date})`,
  );
  await postAssignmentIngest("nhl", data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
