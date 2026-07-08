import * as cheerio from "cheerio";
import {
  BBR_TEAM_SLUG,
  NBA_TEAM_ABBRS,
  type IngestSeason,
} from "./config";

const BBR_TO_NBA: Record<string, string> = {
  BRK: "BKN",
  CHO: "CHA",
  PHO: "PHX",
};

export type TeamSeasonRecord = { wins: number; losses: number };

export function parseBbrStandings(
  html: string,
  season: IngestSeason,
): Record<string, TeamSeasonRecord> {
  const $ = cheerio.load(html);
  const out: Record<string, TeamSeasonRecord> = {};

  $("table").each((_, table) => {
    const $table = $(table);
    const id = $table.attr("id") ?? "";
    if (!id.includes("standings") && !id.includes("divs_standings")) return;

    $table.find("tbody tr").each((__, tr) => {
      const row = $(tr);
      const teamLink = row.find('[data-stat="team_name"] a, td[data-stat="team"] a');
      const href = teamLink.attr("href") ?? "";
      const slugMatch = href.match(/\/teams\/([A-Z]{3})\//);
      const slug = slugMatch?.[1] ?? "";
      const abbr = BBR_TO_NBA[slug] ?? slug;
      if (!abbr) return;

      const wins = Number.parseInt(row.find('[data-stat="wins"]').text(), 10);
      const losses = Number.parseInt(
        row.find('[data-stat="losses"]').text(),
        10,
      );
      if (!Number.isFinite(wins) || !Number.isFinite(losses)) return;
      out[abbr] = { wins, losses };
    });
  });

  return out;
}

export function aggregateRecordsFromGames(
  games: { homeTeam: string; awayTeam: string; homeScore: number; awayScore: number }[],
): Record<string, TeamSeasonRecord> {
  const records: Record<string, TeamSeasonRecord> = {};
  for (const abbr of NBA_TEAM_ABBRS) {
    records[abbr] = { wins: 0, losses: 0 };
  }
  for (const g of games) {
    const home = records[g.homeTeam];
    const away = records[g.awayTeam];
    if (!home || !away) continue;
    if (g.homeScore > g.awayScore) {
      home.wins++;
      away.losses++;
    } else if (g.awayScore > g.homeScore) {
      away.wins++;
      home.losses++;
    }
  }
  return records;
}

export function bbrTeamStandingsUrl(team: string, season: IngestSeason): string {
  const slug = BBR_TEAM_SLUG[team] ?? team;
  const year = Number.parseInt(season.split("-")[0]!, 10) + 1;
  return `https://www.basketball-reference.com/teams/${slug}/${year}.html`;
}
