#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import type { AssignmentGame, AssignmentsFile, RefStatsFile } from "../../src/lib/types";
import {
  fetchEplScoreboard,
  fetchEplSummary,
  lookupRosterNumber,
  normalizeName,
  sleep,
  toEplOfficials,
  yyyymmdd,
} from "./lib/espn";

const outPath = path.join(process.cwd(), "data", "epl", "assignments.json");
const SCAN_DAYS = 21;
const SLATE_STATUSES = new Set([
  "STATUS_SCHEDULED",
  "STATUS_IN_PROGRESS",
  "STATUS_HALFTIME",
  "STATUS_FULL_TIME",
]);

function loadOfficialRoster(): Map<string, number> {
  const dataDir = path.join(process.cwd(), "data", "epl");
  for (const file of ["ref-stats.json", "ref-stats.seed.json"]) {
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(dataDir, file), "utf8"),
      ) as RefStatsFile;
      const roster = new Map<string, number>();
      for (const ref of raw.refs ?? []) {
        roster.set(normalizeName(ref.name), ref.number);
      }
      if (roster.size > 0) return roster;
    } catch {
      /* try next */
    }
  }
  return new Map();
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function torontoDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}

async function findSlateDate(startDate: string): Promise<{
  date: string;
  eventIds: { id: string; awayAbbr: string; homeAbbr: string }[];
}> {
  for (let i = 0; i <= SCAN_DAYS; i++) {
    const date = addDays(startDate, i);
    const events = await fetchEplScoreboard(yyyymmdd(date));
    const slate = events.filter((event) => SLATE_STATUSES.has(event.status));
    if (slate.length > 0) {
      return {
        date,
        eventIds: slate.map((event) => ({
          id: event.id,
          awayAbbr: event.awayAbbr,
          homeAbbr: event.homeAbbr,
        })),
      };
    }
    await sleep(80);
  }
  return { date: startDate, eventIds: [] };
}

async function main() {
  const roster = loadOfficialRoster();
  const start = torontoDate();
  const { date, eventIds } = await findSlateDate(start);
  const games: AssignmentGame[] = [];

  for (const event of eventIds) {
    await sleep(120);
    const summary = await fetchEplSummary(event.id, 2024);
    const officials = summary?.officials ?? [];
    const crew = toEplOfficials(officials, roster);
    if (crew.length === 0 && officials.length > 0) {
      for (const o of officials) {
        crew.push({
          name: o.fullName,
          number: lookupRosterNumber(o.fullName, roster),
          role: "referee",
        });
      }
    }

    games.push({
      id: event.id,
      matchup: `${event.awayAbbr} @ ${event.homeAbbr}`,
      awayTeam: event.awayAbbr,
      homeTeam: event.homeAbbr,
      crew,
    });
  }

  const file: AssignmentsFile = {
    lastUpdated: new Date().toISOString(),
    date,
    source: games.length > 0 ? "espn" : "seeded",
    games,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`EPL assignments: ${games.length} game(s) on ${date} (${file.source})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
