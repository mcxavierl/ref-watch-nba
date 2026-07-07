#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { matchTeamString } from "../../src/lib/nhl/teams";
import type { GameOddsLine, OddsFile } from "../../src/lib/types";

const outPath = path.join(process.cwd(), "data", "nhl", "odds.json");

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

function consensusTotal(event: OddsApiEvent): number | null {
  return consensusFromMarket(event, "totals", (market) => {
    const over = market.outcomes.find((o) => o.name === "Over" && o.point);
    return over?.point ?? null;
  });
}

function consensusHomeSpread(event: OddsApiEvent): number | null {
  return consensusFromMarket(event, "spreads", (market) => {
    const home = market.outcomes.find((o) => o.name === event.home_team);
    return home?.point ?? null;
  });
}

async function fetchOdds(): Promise<OddsFile> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return {
      lastUpdated: new Date().toISOString(),
      source: "benchmark",
      note: "ODDS_API_KEY not set — app uses 6.0 league proxy for NHL gap calculations.",
      lines: [],
    };
  }

  const url = new URL(
    "https://api.the-odds-api.com/v4/sports/icehockey_nhl/odds",
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
    const total = consensusTotal(event);
    if (total === null) continue;
    if (!matchTeamString(event.home_team) || !matchTeamString(event.away_team)) {
      continue;
    }
    lines.push({
      awayTeam: event.away_team,
      homeTeam: event.home_team,
      total,
      homeSpread: consensusHomeSpread(event) ?? undefined,
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
  console.log("Fetching NHL totals and spreads...");
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
