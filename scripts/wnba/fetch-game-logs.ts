#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import type { RuntimeGameLogEntry } from "../../src/lib/game-logs-preload";
import { normalizeWnbaAbbr } from "../../src/lib/wnba/abbr";
import { sleep, fetchWnbaSummaryOfficials, toWnbaOfficials } from "./lib/espn";
import { loadWnbaOfficialRoster } from "./enrich-game-log-officials";

const outPath = path.join(process.cwd(), "data", "wnba", "game-logs.json");
const CORE_EVENTS_BASE =
  "https://sports.core.api.espn.com/v2/sports/basketball/leagues/wnba";
const SUMMARY_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/summary";

const SKIP_TEAMS = new Set(["USA", "WNBASTARS", "CLA", "COL", "EAST", "WEST"]);

function inferSeason(date: string, espnSeasonYear: number): string {
  const year = new Date(`${date}T12:00:00Z`).getFullYear();
  const start = year === espnSeasonYear ? espnSeasonYear : espnSeasonYear;
  const end = (start + 1) % 100;
  return `${start}-${String(end).padStart(2, "0")}`;
}

function parseStat(
  stats: { name?: string; displayValue?: string }[] | undefined,
  name: string,
): number {
  const row = stats?.find((s) => s.name === name);
  if (!row?.displayValue) return 0;
  const n = Number.parseFloat(row.displayValue);
  return Number.isFinite(n) ? n : 0;
}

async function fetchSeasonEventIds(espnSeasonYear: number): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const url =
      `${CORE_EVENTS_BASE}/seasons/${espnSeasonYear}/types/2/events` +
      `?limit=100&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`ESPN WNBA season ${espnSeasonYear} p${page}: ${res.status}`);
    }
    const body = (await res.json()) as {
      pageCount?: number;
      items?: { $ref?: string }[];
    };
    pageCount = body.pageCount ?? 1;
    for (const item of body.items ?? []) {
      const ref = item.$ref ?? "";
      const match = ref.match(/\/events\/(\d+)/);
      if (match?.[1]) ids.push(match[1]);
    }
    page++;
    await sleep(40);
  }

  return ids;
}

async function fetchGameSummary(
  eventId: string,
  espnSeasonYear: number,
): Promise<RuntimeGameLogEntry | null> {
  const res = await fetch(`${SUMMARY_BASE}?event=${eventId}`);
  if (!res.ok) return null;
  const body = (await res.json()) as {
    header?: {
      competitions?: {
        date?: string;
        status?: { type?: { name?: string } };
        competitors?: {
          homeAway: string;
          score?: string;
          team?: { abbreviation?: string };
        }[];
      }[];
    };
    boxscore?: {
      teams?: {
        team?: { abbreviation?: string };
        statistics?: { name?: string; displayValue?: string }[];
      }[];
    };
  };

  const comp = body.header?.competitions?.[0];
  if (!comp) return null;
  const status = comp.status?.type?.name ?? "";
  if (status !== "STATUS_FINAL") return null;

  let awayAbbr = "";
  let homeAbbr = "";
  let awayScore = 0;
  let homeScore = 0;
  for (const team of comp.competitors ?? []) {
    const raw = (team.team?.abbreviation ?? "").toUpperCase();
    if (SKIP_TEAMS.has(raw)) return null;
    const abbr = normalizeWnbaAbbr(raw);
    const score = Number.parseInt(team.score ?? "0", 10) || 0;
    if (team.homeAway === "home") {
      homeAbbr = abbr;
      homeScore = score;
    } else {
      awayAbbr = abbr;
      awayScore = score;
    }
  }
  if (!awayAbbr || !homeAbbr) return null;

  const statsByAbbr = new Map<string, { name?: string; displayValue?: string }[]>();
  for (const team of body.boxscore?.teams ?? []) {
    const raw = (team.team?.abbreviation ?? "").toUpperCase();
    statsByAbbr.set(normalizeWnbaAbbr(raw), team.statistics ?? []);
  }

  const homeFouls = parseStat(statsByAbbr.get(homeAbbr), "fouls");
  const awayFouls = parseStat(statsByAbbr.get(awayAbbr), "fouls");
  const date = (comp.date ?? "").slice(0, 10);
  const roster = loadWnbaOfficialRoster();
  const summaryOfficials = await fetchWnbaSummaryOfficials(eventId);
  const officials = toWnbaOfficials(summaryOfficials, roster);

  return {
    gameId: eventId,
    date,
    season: inferSeason(date, espnSeasonYear),
    league: "WNBA",
    awayTeam: awayAbbr,
    homeTeam: homeAbbr,
    awayScore,
    homeScore,
    totalPoints: awayScore + homeScore,
    totalFouls: homeFouls + awayFouls,
    homeFouls,
    awayFouls,
    closingTotal: 165,
    homeSpread: 0,
    lineSource: "synthetic",
    officials,
  };
}

async function main() {
  const seasons = [2024, 2025];
  const games: RuntimeGameLogEntry[] = [];
  const seen = new Set<string>();

  for (const seasonYear of seasons) {
    console.log(`Fetching WNBA ${seasonYear} event ids...`);
    const eventIds = await fetchSeasonEventIds(seasonYear);
    console.log(`  ${eventIds.length} events`);

    for (const eventId of eventIds) {
      if (seen.has(eventId)) continue;
      await sleep(60);
      const game = await fetchGameSummary(eventId, seasonYear);
      if (!game) continue;
      seen.add(eventId);
      games.push(game);
    }
  }

  games.sort((a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId));

  const file = {
    lastUpdated: new Date().toISOString(),
    league: "WNBA" as const,
    source: "espn",
    games,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`Wrote ${games.length} WNBA games to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
