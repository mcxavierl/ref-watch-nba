import * as fs from "node:fs";
import * as path from "node:path";
import { matchTeamString } from "@/lib/cfb/teams";
import type { GameOddsLine, OddsFile } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data", "cfb");

const EMPTY_ODDS: OddsFile = {
  lastUpdated: new Date().toISOString(),
  source: "benchmark",
  note: "No CFB odds file. Set ODDS_API_KEY and run npm run fetch-cfb-odds, or we use the 6.0 league proxy.",
  lines: [],
};

export function getOdds(): OddsFile {
  try {
    const raw = fs.readFileSync(path.join(dataDir, "odds.json"), "utf8");
    return JSON.parse(raw) as OddsFile;
  } catch {
    return EMPTY_ODDS;
  }
}

export function findOddsTotal(
  awayTeam: string,
  homeTeam: string,
  odds: OddsFile,
): GameOddsLine | undefined {
  const away = matchTeamString(awayTeam);
  const home = matchTeamString(homeTeam);
  if (!away || !home) return undefined;

  return odds.lines.find((line) => {
    const lineAway = matchTeamString(line.awayTeam);
    const lineHome = matchTeamString(line.homeTeam);
    return lineAway?.abbr === away.abbr && lineHome?.abbr === home.abbr;
  });
}

export const findOddsLine = findOddsTotal;

export function benchmarkTotal(
  awayTeam: string,
  homeTeam: string,
  leagueProxy: number,
  odds: OddsFile,
): { total: number; source: "sportsbook" | "league_proxy"; line?: GameOddsLine } {
  const line = findOddsTotal(awayTeam, homeTeam, odds);
  if (line) {
    return { total: line.total, source: "sportsbook", line };
  }
  return { total: leagueProxy, source: "league_proxy" };
}
