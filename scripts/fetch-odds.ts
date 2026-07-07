#!/usr/bin/env npx tsx
/**
 * Optional sportsbook totals via The Odds API.
 * Set ODDS_API_KEY in the environment — without it we write an empty file
 * and the app falls back to the 225 league proxy.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { matchTeamString } from "../src/lib/teams";
import type { GameOddsLine, OddsFile } from "../src/lib/types";

const outPath = path.join(process.cwd(), "data", "odds.json");

interface OddsApiOutcome {
  name: string;
  point?: number;
}

interface OddsApiMarket {
  key: string;
  outcomes: OddsApiOutcome[];
}

interface OddsApiBookmaker {
  key: string;
  markets: OddsApiMarket[];
}

interface OddsApiEvent {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: OddsApiBookmaker[];
}

function consensusTotal(event: OddsApiEvent): number | null {
  const totals: number[] = [];
  for (const book of event.bookmakers) {
    const market = book.markets.find((m) => m.key === "totals");
    if (!market) continue;
    const over = market.outcomes.find((o) => o.name === "Over" && o.point);
    if (over?.point) totals.push(over.point);
  }
  if (totals.length === 0) return null;
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  return Math.round(avg * 2) / 2;
}

async function fetchOdds(): Promise<OddsFile> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return {
      lastUpdated: new Date().toISOString(),
      source: "benchmark",
      note: "ODDS_API_KEY not set — app uses 225 league proxy for gap calculations.",
      lines: [],
    };
  }

  const url = new URL(
    "https://api.the-odds-api.com/v4/sports/basketball_nba/odds",
  );
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "totals");
  url.searchParams.set("oddsFormat", "american");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Odds API ${res.status}: ${await res.text()}`);
  }

  const events = (await res.json()) as OddsApiEvent[];
  const lines: GameOddsLine[] = [];

  for (const event of events) {
    const total = consensusTotal(event);
    if (total === null) continue;
    if (!matchTeamString(event.home_team) || !matchTeamString(event.away_team)) {
      continue;
    }
    lines.push({
      awayTeam: event.away_team,
      homeTeam: event.home_team,
      total,
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
  console.log("Fetching NBA totals...");
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
