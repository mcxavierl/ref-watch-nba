#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import type { AssignmentGame, AssignmentsFile } from "../../src/lib/types";
import { fetchWnbaAssignments } from "../lib/parse-assignments";
import { normalizeWnbaAbbr } from "../../src/lib/wnba/abbr";
import { fetchWnbaScoreboard, sleep, yyyymmdd } from "./lib/espn";

const outPath = path.join(process.cwd(), "data", "wnba", "assignments.json");
const SCAN_DAYS = 21;
const UPCOMING_LIMIT = 10;
const SLATE_STATUSES = new Set([
  "STATUS_SCHEDULED",
  "STATUS_IN_PROGRESS",
  "STATUS_HALFTIME",
]);

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function torontoDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}

function matchupKey(awayTeam: string, homeTeam: string): string {
  return `${awayTeam.toUpperCase()}@${homeTeam.toUpperCase()}`;
}

async function collectUpcomingEvents(startDate: string) {
  const collected: AssignmentGame[] = [];
  const seen = new Set<string>();

  for (let i = 0; i <= SCAN_DAYS && collected.length < UPCOMING_LIMIT; i++) {
    const slateDate = addDays(startDate, i);
    const events = await fetchWnbaScoreboard(yyyymmdd(slateDate));
    for (const event of events) {
      if (!SLATE_STATUSES.has(event.status)) continue;
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      collected.push({
        id: event.id,
        matchup: `${normalizeWnbaAbbr(event.awayAbbr)} @ ${normalizeWnbaAbbr(event.homeAbbr)}`,
        awayTeam: normalizeWnbaAbbr(event.awayAbbr),
        homeTeam: normalizeWnbaAbbr(event.homeAbbr),
        league: "WNBA",
        slateDate,
        crew: [],
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
    `Fetching up to ${UPCOMING_LIMIT} WNBA upcoming games from ${start} (America/Toronto)...`,
  );

  let official: AssignmentsFile | null = null;
  try {
    official = await fetchWnbaAssignments();
  } catch (err) {
    console.warn("Official WNBA assignments unavailable:", err);
  }

  const crewByMatchup = new Map<string, AssignmentGame["crew"]>();
  for (const game of official?.games ?? []) {
    crewByMatchup.set(matchupKey(game.awayTeam, game.homeTeam), game.crew);
  }

  const events = await collectUpcomingEvents(start);
  const games: AssignmentGame[] = [];

  for (const event of events) {
    const crew = crewByMatchup.get(matchupKey(event.awayTeam, event.homeTeam)) ?? [];
    games.push({ ...event, crew });
  }

  const firstSlateDate = games[0]?.slateDate ?? start;
  const hasSlate = games.length > 0;
  const note = hasSlate
    ? `Next ${games.length} WNBA games (${firstSlateDate} onward). Crews from official.nba.com when published.`
    : `No WNBA games found within ${SCAN_DAYS} days of ${start}.`;

  const data: AssignmentsFile = {
    lastUpdated: new Date().toISOString(),
    date: hasSlate ? firstSlateDate : start,
    source: official?.source ?? (hasSlate ? "espn" : "seeded"),
    games,
    ...(hasSlate ? { nextSlateDate: firstSlateDate } : {}),
    note,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${games.length} WNBA game(s) to ${outPath} (${data.date})`);
  console.log(note);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
