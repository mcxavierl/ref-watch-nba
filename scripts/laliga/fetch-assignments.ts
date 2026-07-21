#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import type { AssignmentGame, AssignmentsFile } from "../../src/lib/types";
import {
  fetchLaligaScoreboard,
  sleep,
  yyyymmdd,
} from "./lib/espn";

import { postAssignmentIngest } from "../lib/post-assignment-ingest";
const SCAN_DAYS = 45;
const UPCOMING_LIMIT = 10;
const SLATE_STATUSES = new Set([
  "STATUS_SCHEDULED",
  "STATUS_IN_PROGRESS",
  "STATUS_HALFTIME",
  "STATUS_FULL_TIME",
]);

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
    const events = await fetchLaligaScoreboard(yyyymmdd(slateDate));
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
  const start = torontoDate();
  console.log(
    `Fetching up to ${UPCOMING_LIMIT} La Liga scheduled matchups from ${start} (America/Toronto)...`,
  );

  const events = await collectUpcomingScheduledEvents(start);
  const games: AssignmentGame[] = [];
  const scheduledGames: AssignmentGame[] = [];

  for (const event of events) {
    const baseGame: AssignmentGame = {
      id: event.id,
      matchup: `${event.awayAbbr} @ ${event.homeAbbr}`,
      awayTeam: event.awayAbbr,
      homeTeam: event.homeAbbr,
      league: "LALIGA",
      slateDate: event.slateDate,
      ...(event.slateStartAt ? { slateStartAt: event.slateStartAt } : {}),
      crew: [],
    };
    scheduledGames.push(baseGame);
  }

  const firstSlateDate = events[0]?.slateDate ?? start;
  const hasSlate = events.length > 0;
  const note = hasSlate
    ? `Next ${events.length} La Liga scheduled matchups (${firstSlateDate} onward). Referees publish closer to kickoff.`
    : `No La Liga fixtures found within ${SCAN_DAYS} days of ${start}.`;

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
    `La Liga assignments: ${scheduledGames.length} scheduled on ${file.date} (${file.source})`,
  );
  console.log(note);
  await postAssignmentIngest("laliga", file);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
