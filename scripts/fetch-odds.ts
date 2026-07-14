#!/usr/bin/env npx tsx
/**
 * Optional sportsbook totals + spreads via The Odds API.
 * Set ODDS_API_KEY — without it we write an empty file and use the 225 proxy.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { matchTeamString } from "../src/lib/teams";
import type { GameOddsLine, OddsFile } from "../src/lib/types";

const outPath = path.join(process.cwd(), "data", "odds.json");

interface OddsApiOutcome {
  name: string;
  point?: number;
  price?: number;
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

function consensusFromMarket(
  event: OddsApiEvent,
  marketKey: string,
  pick: (market: OddsApiMarket) => number | null,
): number | null {
  const values: number[] = [];
  for (const book of event.bookmakers) {
    const market = book.markets.find((m) => m.key === marketKey);
    if (!market) continue;
    const val = pick(market);
    if (val !== null) values.push(val);
  }
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 2) / 2;
}

function consensusTotal(event: OddsApiEvent): {
  total: number;
  overOdds?: number;
  underOdds?: number;
} | null {
  const values: number[] = [];
  let overOdds: number | undefined;
  let underOdds: number | undefined;

  for (const book of event.bookmakers) {
    const market = book.markets.find((m) => m.key === "totals");
    if (!market) continue;
    const over = market.outcomes.find((o) => o.name === "Over" && o.point);
    if (over?.point) values.push(over.point);
    if (over?.price !== undefined && overOdds === undefined) {
      overOdds = over.price;
    }
    const under = market.outcomes.find((o) => o.name === "Under" && o.point);
    if (under?.price !== undefined && underOdds === undefined) {
      underOdds = under.price;
    }
  }

  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    total: Math.round(avg * 2) / 2,
    overOdds,
    underOdds,
  };
}

function consensusHomeSpread(event: OddsApiEvent): {
  spread: number;
  homeSpreadOdds?: number;
} | null {
  const values: number[] = [];
  let homeSpreadOdds: number | undefined;

  for (const book of event.bookmakers) {
    const market = book.markets.find((m) => m.key === "spreads");
    if (!market) continue;
    const home = market.outcomes.find((o) => o.name === event.home_team);
    if (home?.point !== undefined) values.push(home.point);
    if (home?.price !== undefined && homeSpreadOdds === undefined) {
      homeSpreadOdds = home.price;
    }
  }

  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    spread: Math.round(avg * 2) / 2,
    homeSpreadOdds,
  };
}

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
