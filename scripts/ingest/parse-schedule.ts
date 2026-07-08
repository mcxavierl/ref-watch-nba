import * as cheerio from "cheerio";

const BBR_TO_NBA: Record<string, string> = {
  BRK: "BKN",
  CHO: "CHA",
  PHO: "PHX",
  NOH: "NOP",
  NOK: "NOP",
  NJN: "BKN",
};

export interface BbrScheduleGame {
  bbrGameId: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  boxScoreUrl: string;
  isPlayoff: boolean;
}

function normalizeTeam(raw: string): string {
  const abbr = raw.trim().toUpperCase();
  return BBR_TO_NBA[abbr] ?? abbr;
}

function parseScore(cell: cheerio.Cheerio): number | null {
  const text = cell.text().trim();
  if (!text || text === "") return null;
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) ? n : null;
}

export function parseBbrSchedule(
  html: string,
  season: string,
): BbrScheduleGame[] {
  const $ = cheerio.load(html);
  const games: BbrScheduleGame[] = [];

  $("#schedule tbody tr, table#schedule tbody tr").each((_, tr) => {
    const row = $(tr);
    if (row.hasClass("thead")) return;

    const dateCell = row.find('[data-stat="date_game"]');
    const dateLink = dateCell.find("a").attr("href") ?? "";
    const dateText = dateCell.text().trim();
    if (!dateText) return;

    const visitor = normalizeTeam(
      row.find('[data-stat="visitor_team_name"]').text(),
    );
    const home = normalizeTeam(row.find('[data-stat="home_team_name"]').text());
    const visitorScore = parseScore(row.find('[data-stat="pts_visit"]'));
    const homeScore = parseScore(row.find('[data-stat="pts_home"]'));

    if (!visitor || !home || visitorScore === null || homeScore === null) {
      return;
    }

    const boxScoreUrl = dateLink.startsWith("http")
      ? dateLink
      : `https://www.basketball-reference.com${dateLink}`;

    const bbrGameId = dateLink.split("/").pop()?.replace(".html", "") ?? "";

    games.push({
      bbrGameId,
      date: dateText,
      season,
      homeTeam: home,
      awayTeam: visitor,
      homeScore,
      awayScore,
      boxScoreUrl,
      isPlayoff: false,
    });
  });

  return games;
}

export function parseBbrPlayoffs(
  html: string,
  season: string,
): BbrScheduleGame[] {
  const $ = cheerio.load(html);
  const games: BbrScheduleGame[] = [];

  $("table").each((_, table) => {
    const $table = $(table);
    $table.find("tbody tr").each((__, tr) => {
      const row = $(tr);
      const dateCell = row.find('[data-stat="date"], [data-stat="date_game"]');
      const dateText = dateCell.text().trim();
      if (!dateText) return;

      const visitor = normalizeTeam(
        row.find('[data-stat="visitor_team_name"], [data-stat="team_name_opp"]')
          .text(),
      );
      const home = normalizeTeam(
        row.find('[data-stat="home_team_name"], [data-stat="team_name"]')
          .text(),
      );
      const visitorScore = parseScore(
        row.find('[data-stat="pts_visit"], [data-stat="opp_pts"]'),
      );
      const homeScore = parseScore(
        row.find('[data-stat="pts_home"], [data-stat="pts"]'),
      );

      if (!visitor || !home || visitorScore === null || homeScore === null) {
        return;
      }

      games.push({
        bbrGameId: `${dateText}-${visitor}-${home}`,
        date: dateText,
        season,
        homeTeam: home,
        awayTeam: visitor,
        homeScore,
        awayScore,
        boxScoreUrl: "",
        isPlayoff: true,
      });
    });
  });

  return games;
}
