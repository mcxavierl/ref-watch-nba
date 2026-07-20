#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import type { AssignmentGame, AssignmentsFile, RefStatsFile } from "../../src/lib/types";
import { seasonStageFromEspnSeason } from "../../src/lib/assignment-season-stage";
import {
  fetchEspnScoreboard,
  fetchEspnSummary,
  sleep,
  toRefOfficials,
  torontoDate,
  yyyymmdd,
} from "./lib/espn";

const outPath = path.join(process.cwd(), "data", "nfl", "assignments.json");
const SCAN_DAYS = 45;
const UPCOMING_LIMIT = 10;
const SLATE_STATUSES = new Set([
  "STATUS_SCHEDULED",
  "STATUS_IN_PROGRESS",
  "STATUS_HALFTIME",
  "STATUS_END_PERIOD",
  "STATUS_FINAL",
]);

function loadOfficialRoster(): Map<string, number> {
  const dataDir = path.join(process.cwd(), "data", "nfl");
  for (const file of ["ref-stats.json", "ref-stats.seed.json"]) {
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(dataDir, file), "utf8"),
      ) as RefStatsFile;
      const roster = new Map<string, number>();
      for (const ref of raw.refs ?? []) {
        roster.set(
          ref.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z\s]/g, "")
            .trim(),
          ref.number,
        );
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

type SlateEvent = {
  id: string;
  awayAbbr: string;
  homeAbbr: string;
  seasonType?: number;
  seasonSlug?: string;
  slateDate: string;
  slateStartAt?: string;
};

async function collectUpcomingPreseasonEvents(
  startDate: string,
): Promise<SlateEvent[]> {
  const collected: SlateEvent[] = [];
  const seen = new Set<string>();

  for (let i = 0; i <= SCAN_DAYS && collected.length < UPCOMING_LIMIT; i++) {
    const slateDate = addDays(startDate, i);
    const events = await fetchEspnScoreboard(yyyymmdd(slateDate));
    for (const event of events) {
      if (!SLATE_STATUSES.has(event.status)) continue;
      const seasonStage = seasonStageFromEspnSeason({
        type: event.seasonType,
        slug: event.seasonSlug,
      });
      if (seasonStage !== "preseason") continue;
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      collected.push({
        id: event.id,
        awayAbbr: event.awayAbbr,
        homeAbbr: event.homeAbbr,
        seasonType: event.seasonType,
        seasonSlug: event.seasonSlug,
        slateDate,
        slateStartAt: event.startsAt,
      });
      if (collected.length >= UPCOMING_LIMIT) break;
    }
    await sleep(80);
  }

  return collected;
}

async function main() {
  const requestedDate = torontoDate();
  console.log(
    `Fetching up to ${UPCOMING_LIMIT} NFL pre-season matchups from ${requestedDate} (America/Toronto)...`,
  );

  const roster = loadOfficialRoster();
  const events = await collectUpcomingPreseasonEvents(requestedDate);
  const games: AssignmentGame[] = [];
  const scheduledGames: AssignmentGame[] = [];
  let crewsPending = false;

  for (const event of events) {
    await sleep(100);
    const summary = await fetchEspnSummary(event.id);
    const seasonStage = seasonStageFromEspnSeason({
      type: event.seasonType,
      slug: event.seasonSlug,
    });
    const baseGame = {
      id: event.id,
      matchup: `${event.awayAbbr} @ ${event.homeAbbr}`,
      awayTeam: event.awayAbbr,
      homeTeam: event.homeAbbr,
      league: "NFL" as const,
      slateDate: event.slateDate,
      ...(event.slateStartAt ? { slateStartAt: event.slateStartAt } : {}),
      ...(seasonStage ? { seasonStage } : {}),
    };
    if (!summary || summary.officials.length === 0) {
      crewsPending = true;
      scheduledGames.push({
        ...baseGame,
        crew: [],
      });
      continue;
    }

    const crew = toRefOfficials(summary.officials, roster);
    games.push({
      ...baseGame,
      crew,
    });
  }

  const firstSlateDate = events[0]?.slateDate ?? requestedDate;
  const hasSlate = events.length > 0;
  const note =
    games.length > 0 && firstSlateDate !== requestedDate
      ? `No games on ${requestedDate}; next pre-season slate is ${firstSlateDate}.`
      : games.length === 0 && hasSlate && crewsPending
        ? `Next ${events.length} NFL pre-season matchups (${firstSlateDate} onward). Crew assignments not published yet.`
        : games.length === 0 && !hasSlate
          ? `No NFL pre-season games found within ${SCAN_DAYS} days of ${requestedDate}.`
          : undefined;

  const data: AssignmentsFile = {
    lastUpdated: new Date().toISOString(),
    date: hasSlate ? firstSlateDate : requestedDate,
    source: games.length > 0 ? "espn" : hasSlate ? "espn" : "seeded",
    games,
    ...(scheduledGames.length > 0 ? { scheduledGames } : {}),
    ...(hasSlate ? { nextSlateDate: firstSlateDate } : {}),
    ...(note ? { note } : {}),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(
    `Wrote ${games.length} live + ${scheduledGames.length} scheduled NFL game(s) to ${outPath}`,
  );
  if (note) console.log(note);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
