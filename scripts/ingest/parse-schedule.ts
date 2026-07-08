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

function normalizeTeamFromHref(href: string): string | null {
  const match = href.match(/\/teams\/([A-Z]{3})\//);
  if (!match?.[1]) return null;
  return BBR_TO_NBA[match[1]] ?? match[1];
}

function parseIsoDate(csk: string, linkText: string): string {
  const cskMatch = csk.match(/^(\d{4})(\d{2})(\d{2})/);
  if (cskMatch) {
    return `${cskMatch[1]}-${cskMatch[2]}-${cskMatch[3]}`;
  }
  const textMatch = linkText.match(
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),\s+(\d{4})/,
  );
  if (textMatch) {
    const months: Record<string, string> = {
      Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
      Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
    };
    const m = months[textMatch[1]!.slice(0, 3)] ?? "01";
    const d = textMatch[2]!.padStart(2, "0");
    return `${textMatch[3]}-${m}-${d}`;
  }
  return "";
}

function parseScore(cell: cheerio.Cheerio): number | null {
  const text = cell.text().trim();
  if (!text) return null;
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) ? n : null;
}

export function parseBbrSchedule(
  html: string,
  season: string,
): BbrScheduleGame[] {
  const $ = cheerio.load(html);
  const games: BbrScheduleGame[] = [];

  $("#schedule tbody tr").each((_, tr) => {
    const row = $(tr);
    if (row.hasClass("thead")) return;

    const dateCell = row.find('[data-stat="date_game"]');
    const csk = dateCell.attr("csk") ?? "";
    const dateText = dateCell.find("a").text().trim() || dateCell.text().trim();
    const date = parseIsoDate(csk, dateText);
    if (!date) return;

    const visitorHref =
      row.find('[data-stat="visitor_team_name"] a').attr("href") ?? "";
    const homeHref =
      row.find('[data-stat="home_team_name"] a').attr("href") ?? "";
    const visitor = normalizeTeamFromHref(visitorHref);
    const home = normalizeTeamFromHref(homeHref);

    const visitorScore = parseScore(
      row.find('[data-stat="visitor_pts"], [data-stat="pts_visit"]'),
    );
    const homeScore = parseScore(
      row.find('[data-stat="home_pts"], [data-stat="pts_home"]'),
    );

    if (!visitor || !home || visitorScore === null || homeScore === null) {
      return;
    }

    const boxHref =
      row.find('[data-stat="box_score_text"] a').attr("href") ?? "";
    const boxScoreUrl = boxHref.startsWith("http")
      ? boxHref
      : boxHref
        ? `https://www.basketball-reference.com${boxHref}`
        : "";

    const bbrGameId =
      csk.replace(/[A-Z]{3}$/, "") ||
      (boxHref.split("/").pop()?.replace(".html", "") ?? "");

    games.push({
      bbrGameId,
      date,
      season,
      homeTeam: home,
      awayTeam: visitor,
      homeScore,
      awayScore: visitorScore,
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

  $("table tbody tr").each((_, tr) => {
    const row = $(tr);
    const dateCell = row.find('[data-stat="date_game"], [data-stat="date"]');
    if (!dateCell.length) return;

    const csk = dateCell.attr("csk") ?? "";
    const dateText = dateCell.find("a").text().trim() || dateCell.text().trim();
    const date = parseIsoDate(csk, dateText);
    if (!date) return;

    const visitorHref =
      row.find('[data-stat="visitor_team_name"] a').attr("href") ?? "";
    const homeHref =
      row.find('[data-stat="home_team_name"] a').attr("href") ?? "";
    const visitor = normalizeTeamFromHref(visitorHref);
    const home = normalizeTeamFromHref(homeHref);

    const visitorScore = parseScore(
      row.find('[data-stat="visitor_pts"], [data-stat="pts_visit"]'),
    );
    const homeScore = parseScore(
      row.find('[data-stat="home_pts"], [data-stat="pts_home"]'),
    );

    if (!visitor || !home || visitorScore === null || homeScore === null) {
      return;
    }

    games.push({
      bbrGameId: `${date}-${visitor}-${home}`,
      date,
      season,
      homeTeam: home,
      awayTeam: visitor,
      homeScore,
      awayScore: visitorScore,
      boxScoreUrl: "",
      isPlayoff: true,
    });
  });

  return games;
}
