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
const SCAN_DAYS = 45;
const UPCOMING_LIMIT = 10;
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

type SlateEvent = {
  id: string;
  awayAbbr: string;
  homeAbbr: string;
  slateDate: string;
  slateStartAt?: string;
};

async function collectUpcomingScheduledEvents(
  startDate: string,
): Promise<SlateEvent[]> {
  const collected: SlateEvent[] = [];
  const seen = new Set<string>();

  for (let i = 0; i <= SCAN_DAYS && collected.length < UPCOMING_LIMIT; i++) {
    const slateDate = addDays(startDate, i);
    const events = await fetchEplScoreboard(yyyymmdd(slateDate));
    for (const event of events) {
      if (!SLATE_STATUSES.has(event.status)) continue;
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      collected.push({
        id: event.id,
        awayAbbr: event.awayAbbr,
        homeAbbr: event.homeAbbr,
        slateDate: event.date,
        slateStartAt: event.startsAt,
      });
      if (collected.length >= UPCOMING_LIMIT) break;
    }
    await sleep(80);
  }

  return collected;
}

async function main() {
  const roster = loadOfficialRoster();
  const start = torontoDate();
  console.log(
    `Fetching up to ${UPCOMING_LIMIT} EPL scheduled matchups from ${start} (America/Toronto)...`,
  );

  const events = await collectUpcomingScheduledEvents(start);
  const games: AssignmentGame[] = [];
  const scheduledGames: AssignmentGame[] = [];

  for (const event of events) {
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

    const baseGame: AssignmentGame = {
      id: event.id,
      matchup: `${event.awayAbbr} @ ${event.homeAbbr}`,
      awayTeam: event.awayAbbr,
      homeTeam: event.homeAbbr,
      league: "EPL",
      slateDate: event.slateDate,
      ...(event.slateStartAt ? { slateStartAt: event.slateStartAt } : {}),
      crew,
    };

    if (crew.length > 0) {
      games.push(baseGame);
    } else {
      scheduledGames.push({ ...baseGame, crew: [] });
    }
  }

  const firstSlateDate = events[0]?.slateDate ?? start;
  const hasSlate = events.length > 0;
  const note = hasSlate
    ? `Next ${events.length} EPL scheduled matchups (${firstSlateDate} onward). Officials publish closer to kickoff.`
    : `No EPL fixtures found within ${SCAN_DAYS} days of ${start}.`;

  const file: AssignmentsFile = {
    lastUpdated: new Date().toISOString(),
    date: hasSlate ? firstSlateDate : start,
    source: hasSlate ? "espn" : "seeded",
    games,
    ...(scheduledGames.length > 0 ? { scheduledGames } : {}),
    ...(hasSlate ? { nextSlateDate: firstSlateDate } : {}),
    note,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(file, null, 2)}\n`);
  console.log(
    `EPL assignments: ${games.length} live + ${scheduledGames.length} scheduled on ${file.date} (${file.source})`,
  );
  console.log(note);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
