#!/usr/bin/env npx tsx
/**
 * Backfill historical NBA closing totals + spreads via The Odds API.
 *
 * Requires ODDS_API_KEY on a paid usage plan (historical odds from mid-2020).
 * Output: data/game-lines.json keyed by NBA gameId for merge-market-lines.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { loadEnvFiles } from "../lib/load-env";
import {
  consensusHomeSpread,
  consensusTotal,
  type HistoricalOddsSnapshot,
  type OddsApiEvent,
} from "../lib/odds-api-consensus";
import { loadGameLogs } from "../lib/game-logs";
import { matchTeamString } from "../../src/lib/teams";
import type { GameOddsLine, OddsFile } from "../../src/lib/types";

loadEnvFiles();

const OUT_PATH = path.join(process.cwd(), "data", "game-lines.json");
const MIN_HISTORICAL_DATE = "2020-07-01";
const DEFAULT_MAX_DAYS = 14;
const REQUEST_DELAY_MS = 350;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]) {
  let from = MIN_HISTORICAL_DATE;
  let to = new Date().toISOString().slice(0, 10);
  let maxDays = DEFAULT_MAX_DAYS;
  let full = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--full") full = true;
    else if (arg === "--from") from = argv[++i] ?? from;
    else if (arg === "--to") to = argv[++i] ?? to;
    else if (arg === "--max-days") {
      maxDays = Number.parseInt(argv[++i] ?? "", 10);
    }
  }

  return { from, to, maxDays: full ? Number.POSITIVE_INFINITY : maxDays, full };
}

function matchupKey(date: string, awayAbbr: string, homeAbbr: string): string {
  return `${date}|${awayAbbr}|${homeAbbr}`;
}

function eventDate(commenceTime: string): string {
  return commenceTime.slice(0, 10);
}

export function buildGameIndex(root = process.cwd()) {
  const file = loadGameLogs("NBA");
  const byMatchup = new Map<
    string,
    { gameId: string; date: string; awayTeam: string; homeTeam: string }
  >();

  if (!file) return { byMatchup, dates: [] as string[] };

  const dateSet = new Set<string>();
  for (const game of file.games) {
    if (game.date < MIN_HISTORICAL_DATE) continue;
    dateSet.add(game.date);
    byMatchup.set(matchupKey(game.date, game.awayTeam, game.homeTeam), {
      gameId: game.gameId,
      date: game.date,
      awayTeam: game.awayTeam,
      homeTeam: game.homeTeam,
    });
  }

  return {
    byMatchup,
    dates: [...dateSet].sort((a, b) => a.localeCompare(b)),
  };
}

export function eventToLine(
  event: OddsApiEvent,
  byMatchup: Map<
    string,
    { gameId: string; date: string; awayTeam: string; homeTeam: string }
  >,
): GameOddsLine | null {
  const away = matchTeamString(event.away_team);
  const home = matchTeamString(event.home_team);
  if (!away || !home) return null;

  const date = eventDate(event.commence_time);
  const match = byMatchup.get(matchupKey(date, away.abbr, home.abbr));

  const totalLine = consensusTotal(event);
  if (!totalLine) return null;

  const spreadLine = consensusHomeSpread(event);
  return {
    gameId: match?.gameId,
    awayTeam: away.abbr,
    homeTeam: home.abbr,
    total: totalLine.total,
    overOdds: totalLine.overOdds,
    underOdds: totalLine.underOdds,
    homeSpread: spreadLine?.spread,
    homeSpreadOdds: spreadLine?.homeSpreadOdds,
    source: "the-odds-api-historical",
    lastUpdated: event.commence_time,
  };
}

async function fetchHistoricalSnapshot(
  apiKey: string,
  dateIso: string,
): Promise<HistoricalOddsSnapshot> {
  const url = new URL(
    "https://api.the-odds-api.com/v4/historical/sports/basketball_nba/odds",
  );
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "totals,spreads");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");
  url.searchParams.set("date", dateIso);

  const res = await fetch(url.toString());
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Odds API ${res.status}: ${body}`);
  }
  return JSON.parse(body) as HistoricalOddsSnapshot;
}

function readExistingLines(): Map<string, GameOddsLine> {
  const map = new Map<string, GameOddsLine>();
  try {
    const raw = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as OddsFile;
    for (const line of raw.lines ?? []) {
      const key =
        line.gameId ??
        `${line.lastUpdated.slice(0, 10)}|${line.awayTeam}|${line.homeTeam}`;
      map.set(key, line);
    }
  } catch {
    /* optional file */
  }
  return map;
}

function writeLines(lines: GameOddsLine[], note?: string): void {
  const data: OddsFile = {
    lastUpdated: new Date().toISOString(),
    source: "the-odds-api",
    note:
      note ??
      "Historical NBA closing totals and spreads from The Odds API (consensus US books). Run npm run merge-market-lines to apply to game logs.",
    lines: [...lines].sort(
      (a, b) =>
        a.lastUpdated.localeCompare(b.lastUpdated) ||
        `${a.awayTeam}|${a.homeTeam}`.localeCompare(`${b.awayTeam}|${b.homeTeam}`),
    ),
  };
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

export async function fetchHistoricalNbaLines(options: {
  apiKey: string;
  from: string;
  to: string;
  maxDays: number;
}): Promise<{ lines: GameOddsLine[]; daysFetched: number }> {
  const { byMatchup, dates } = buildGameIndex();
  const selectedDates = dates.filter(
    (date) => date >= options.from && date <= options.to,
  );
  const slice = selectedDates.slice(0, options.maxDays);

  const merged = readExistingLines();
  let daysFetched = 0;

  for (const date of slice) {
    const snapshotDate = `${date}T23:00:00Z`;
    const snapshot = await fetchHistoricalSnapshot(options.apiKey, snapshotDate);
    daysFetched += 1;

    for (const event of snapshot.data) {
      const line = eventToLine(event, byMatchup);
      if (!line) continue;
      const key =
        line.gameId ??
        `${line.lastUpdated.slice(0, 10)}|${line.awayTeam}|${line.homeTeam}`;
      merged.set(key, line);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  return {
    lines: [...merged.values()],
    daysFetched,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.ODDS_API_KEY;

  if (!apiKey) {
    writeLines([], "ODDS_API_KEY not set. Add it to .env.local to backfill historical closing lines.");
    console.log(`Wrote empty ${OUT_PATH} (no ODDS_API_KEY).`);
    return;
  }

  console.log(
    `Fetching historical NBA closing lines (${args.from} to ${args.to}, max ${args.full ? "all" : args.maxDays} days)...`,
  );

  try {
    const { lines, daysFetched } = await fetchHistoricalNbaLines({
      apiKey,
      from: args.from,
      to: args.to,
      maxDays: args.maxDays,
    });

    writeLines(lines);
    const withGameId = lines.filter((line) => line.gameId).length;
    console.log(
      `Wrote ${lines.length} line(s) (${withGameId} with gameId) from ${daysFetched} day snapshot(s) → ${OUT_PATH}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("HISTORICAL_UNAVAILABLE_ON_FREE_USAGE_PLAN")) {
      writeLines(
        [],
        "ODDS_API_KEY is on a free plan. Historical NBA closing totals require a paid Odds API usage plan.",
      );
      console.warn(
        "Historical odds unavailable on free usage plan. Upgrade at https://the-odds-api.com and re-run.",
      );
      return;
    }
    throw error;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
