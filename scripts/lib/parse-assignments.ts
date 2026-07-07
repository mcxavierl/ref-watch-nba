import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { AssignmentGame, AssignmentsFile, RefOfficial } from "./types";
import { parseRefFromCell, refSlug } from "./slug";

const ASSIGNMENTS_URL = "https://official.nba.com/referee-assignments/";

function parseMatchup(matchup: string): { awayTeam: string; homeTeam: string } {
  const parts = matchup.split("@").map((s) => s.trim());
  if (parts.length !== 2) {
    return { awayTeam: matchup, homeTeam: "" };
  }
  return { awayTeam: parts[0], homeTeam: parts[1] };
}

function parseTableRows(
  $: cheerio.CheerioAPI,
  tableEl: Element,
  league: "NBA" | "WNBA",
): AssignmentGame[] {
  const games: AssignmentGame[] = [];
  const rows = $(tableEl).find("tr").toArray();

  for (let i = 1; i < rows.length; i++) {
    const cells = $(rows[i])
      .find("td")
      .toArray()
      .map((cell) => $(cell).text().replace(/\s+/g, " ").trim());

    if (cells.length < 4 || !cells[0]) continue;

    const matchup = cells[0];
    const { awayTeam, homeTeam } = parseMatchup(matchup);
    const roles: RefOfficial["role"][] = [
      "crew_chief",
      "referee",
      "umpire",
      "alternate",
    ];

    const crew: RefOfficial[] = [];
    for (let col = 1; col <= 3; col++) {
      const cell = cells[col];
      if (!cell) continue;
      const { name, number } = parseRefFromCell(cell);
      if (!name) continue;
      crew.push({ name, number, role: roles[col - 1] });
    }

    games.push({
      id: `${league.toLowerCase()}-${refSlug(awayTeam, 0)}-${refSlug(homeTeam, 0)}-${i}`,
      matchup,
      awayTeam,
      homeTeam,
      league,
      crew,
    });
  }

  return games;
}

export async function fetchAssignments(): Promise<AssignmentsFile> {
  const { BROWSER_HEADERS } = await import("./nba-headers");
  const res = await fetch(ASSIGNMENTS_URL, { headers: BROWSER_HEADERS });
  if (!res.ok) {
    throw new Error(`Assignments fetch failed: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html) as cheerio.CheerioAPI;
  const today = new Date().toISOString().slice(0, 10);
  const games: AssignmentGame[] = [];

  const headers = $("h1.entry-title").toArray();
  const tables = $("table").toArray();

  for (let i = 0; i < headers.length; i++) {
    const title = $(headers[i]).text().trim();
    const league = title.startsWith("NBA Referee")
      ? "NBA"
      : title.startsWith("WNBA Referee")
        ? "WNBA"
        : null;
    if (!league) continue;

    const table = tables[i];
    if (!table) continue;
    games.push(...parseTableRows($, table, league));
  }

  return {
    lastUpdated: new Date().toISOString(),
    date: today,
    source: "official.nba.com",
    games: games.filter((g) => g.league === "NBA"),
  };
}
