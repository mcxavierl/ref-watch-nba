#!/usr/bin/env npx tsx
/**
 * Stub NFL odds fetcher: reads pickcenter from ESPN game summaries when available.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { matchTeamString } from "../../src/lib/nfl/teams";
import type { GameOddsLine, OddsFile } from "../../src/lib/types";
import { fetchEspnScoreboard, sleep, torontoDate, yyyymmdd } from "./lib/espn";

const outPath = path.join(process.cwd(), "data", "nfl", "odds.json");

interface PickCenterEntry {
  overUnder?: number;
  spread?: number;
  homeTeamOdds?: { favorite?: boolean; underdog?: boolean };
}

interface SummaryResponse {
  pickcenter?: PickCenterEntry[];
  header?: {
    competitions?: {
      competitors?: {
        homeAway?: string;
        team?: { displayName?: string; abbreviation?: string };
      }[];
    }[];
  };
}

async function fetchPickcenterLines(date: string): Promise<GameOddsLine[]> {
  const events = await fetchEspnScoreboard(yyyymmdd(date));
  const lines: GameOddsLine[] = [];

  for (const event of events) {
    await sleep(80);
    const summaryRes = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${event.id}`,
    );
    if (!summaryRes.ok) continue;
    const summary = (await summaryRes.json()) as SummaryResponse;
    const pick = summary.pickcenter?.find(
      (entry) =>
        typeof entry.overUnder === "number" && Number.isFinite(entry.overUnder),
    );
    if (!pick?.overUnder) continue;

    const homeName = event.homeAbbr;
    const awayName = event.awayAbbr;
    if (!matchTeamString(homeName) || !matchTeamString(awayName)) continue;

    let homeSpread = pick.spread;
    if (typeof homeSpread === "number" && pick.homeTeamOdds?.underdog) {
      homeSpread = Math.abs(homeSpread);
    } else if (typeof homeSpread === "number" && pick.homeTeamOdds?.favorite) {
      homeSpread = -Math.abs(homeSpread);
    }

    lines.push({
      gameId: event.id,
      awayTeam: awayName,
      homeTeam: homeName,
      total: pick.overUnder,
      homeSpread,
      source: "espn-pickcenter",
      lastUpdated: new Date().toISOString(),
    });
  }

  return lines;
}

async function main() {
  const date = torontoDate();
  console.log(`Fetching NFL pickcenter lines for ${date}...`);

  const lines = await fetchPickcenterLines(date);
  const data: OddsFile = {
    lastUpdated: new Date().toISOString(),
    source: lines.length > 0 ? "espn-pickcenter" : "benchmark",
    note:
      lines.length > 0
        ? "Closing lines from ESPN pickcenter on today's slate."
        : "No pickcenter lines on today's slate — app uses league proxy totals.",
    lines,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${lines.length} line(s) to ${outPath} (${data.source})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
