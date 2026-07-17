#!/usr/bin/env npx tsx
/**
 * Optional sportsbook totals + spreads via The Odds API.
 * Set ODDS_API_KEY — without it we write an empty file and use the 225 proxy.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { loadEnvFiles } from "./lib/load-env";
import {
  consensusHomeSpread,
  consensusTotal,
  type OddsApiEvent,
} from "./lib/odds-api-consensus";
import { matchTeamString } from "../src/lib/teams";
import type { GameOddsLine, OddsFile } from "../src/lib/types";

loadEnvFiles();

const outPath = path.join(process.cwd(), "data", "odds.json");

async function fetchOdds(): Promise<OddsFile> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return {
      lastUpdated: new Date().toISOString(),
      source: "benchmark",
      note: "ODDS_API_KEY not set. App uses 225 league proxy for gap calculations.",
      lines: [],
    };
  }

  const url = new URL(
    "https://api.the-odds-api.com/v4/sports/basketball_nba/odds",
  );
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "totals,spreads");
  url.searchParams.set("oddsFormat", "american");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Odds API ${res.status}: ${await res.text()}`);
  }

  const events = (await res.json()) as OddsApiEvent[];
  const lines: GameOddsLine[] = [];

  for (const event of events) {
    const totalLine = consensusTotal(event);
    if (totalLine === null) continue;
    if (!matchTeamString(event.home_team) || !matchTeamString(event.away_team)) {
      continue;
    }
    const spreadLine = consensusHomeSpread(event);
    lines.push({
      awayTeam: event.away_team,
      homeTeam: event.home_team,
      total: totalLine.total,
      overOdds: totalLine.overOdds,
      underOdds: totalLine.underOdds,
      homeSpread: spreadLine?.spread ?? undefined,
      homeSpreadOdds: spreadLine?.homeSpreadOdds,
      source: "consensus",
      lastUpdated: event.commence_time,
    });
  }

  return {
    lastUpdated: new Date().toISOString(),
    source: "the-odds-api",
    lines,
  };
}

async function main() {
  console.log("Fetching NBA totals and spreads...");
  const data = await fetchOdds();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(
    `Wrote ${data.lines.length} line(s) to ${outPath} (${data.source})`,
  );
  if (data.note) console.log(data.note);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
