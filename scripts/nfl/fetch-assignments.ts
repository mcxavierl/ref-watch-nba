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

async function findSlateDate(startDate: string): Promise<{
  date: string;
  eventIds: {
    id: string;
    awayAbbr: string;
    homeAbbr: string;
    seasonType?: number;
    seasonSlug?: string;
  }[];
}> {
  for (let i = 0; i <= SCAN_DAYS; i++) {
    const date = addDays(startDate, i);
    const events = await fetchEspnScoreboard(yyyymmdd(date));
    const slate = events.filter((event) => SLATE_STATUSES.has(event.status));
    if (slate.length > 0) {
      return {
        date,
        eventIds: slate.map((event) => ({
          id: event.id,
          awayAbbr: event.awayAbbr,
          homeAbbr: event.homeAbbr,
          seasonType: event.seasonType,
          seasonSlug: event.seasonSlug,
        })),
      };
    }
    await sleep(80);
  }
  return { date: startDate, eventIds: [] };
}

async function main() {
  const requestedDate = torontoDate();
  console.log(
    `Fetching NFL slate for ${requestedDate} (America/Toronto), scanning forward if empty...`,
  );

  const roster = loadOfficialRoster();
  const { date, eventIds } = await findSlateDate(requestedDate);
  const games: AssignmentGame[] = [];
  const scheduledGames: AssignmentGame[] = [];
  let crewsPending = false;

  for (const event of eventIds) {
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

  const hasSlate = eventIds.length > 0;
  const note =
    games.length > 0 && date !== requestedDate
      ? `No games on ${requestedDate}; next slate with crews is ${date}.`
      : games.length === 0 && hasSlate && crewsPending
        ? `Next NFL slate is ${date} (${eventIds.length} game${eventIds.length === 1 ? "" : "s"} on ESPN). Crew assignments not published yet.`
        : games.length === 0 && !hasSlate
          ? `No NFL games found within ${SCAN_DAYS} days of ${requestedDate}.`
          : undefined;

  const data: AssignmentsFile = {
    lastUpdated: new Date().toISOString(),
    date: hasSlate ? date : requestedDate,
    source: games.length > 0 ? "espn" : hasSlate ? "espn" : "seeded",
    games,
    ...(scheduledGames.length > 0 ? { scheduledGames } : {}),
    ...(hasSlate ? { nextSlateDate: date } : {}),
    ...(note ? { note } : {}),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(
    `Wrote ${games.length} NFL game(s) to ${outPath} (slate date: ${data.date}, source: ${data.source})`,
  );
  if (note) console.log(note);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
