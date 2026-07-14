import * as cheerio from "cheerio";

const BBR_TO_NBA: Record<string, string> = {
  BRK: "BKN",
  CHO: "CHA",
  PHO: "PHX",
  NOH: "NOP",
  NOK: "NOP",
  NJN: "BKN",
};

export interface BoxscoreFouls {
  homeFouls: number;
  awayFouls: number;
}

export interface BoxscorePeriodFouls {
  unit: "quarter";
  buckets: { period: number; home: number; away: number }[];
}

function bbrCodeToNba(code: string): string {
  return BBR_TO_NBA[code] ?? code;
}

function parsePfFromTable($: ReturnType<typeof cheerio.load>, table: cheerio.Element): number | null {
  const tfootRow = $(table).find("tfoot tr").first();
  const pfText = tfootRow.find('[data-stat="pf"]').first().text().trim();
  if (!pfText) return null;
  const pf = Number.parseInt(pfText, 10);
  return Number.isFinite(pf) ? pf : null;
}

/**
 * Parse home/away team fouls from BBR boxscore HTML.
 * Uses `table[id^="box-"][id$="-game-basic"]` tfoot Team Totals PF rows.
 */
export function parseBoxscoreFouls(
  html: string,
  homeTeam: string,
  awayTeam: string,
): BoxscoreFouls | null {
  if (!html.trim()) return null;

  const $ = cheerio.load(html);
  const foulsByTeam = new Map<string, number>();

  $('table[id^="box-"][id$="-game-basic"]').each((_, table) => {
    const id = $(table).attr("id") ?? "";
    const match = id.match(/^box-([A-Z0-9]{3})-game-basic$/);
    if (!match?.[1]) return;

    const pf = parsePfFromTable($, table);
    if (pf === null) return;
    foulsByTeam.set(bbrCodeToNba(match[1]), pf);
  });

  const homeFouls = foulsByTeam.get(homeTeam);
  const awayFouls = foulsByTeam.get(awayTeam);
  if (homeFouls === undefined || awayFouls === undefined) return null;

  return { homeFouls, awayFouls };
}

const QUARTER_TABLE_SUFFIXES: { suffix: string; period: number }[] = [
  { suffix: "q1-basic", period: 1 },
  { suffix: "q2-basic", period: 2 },
  { suffix: "q3-basic", period: 3 },
  { suffix: "q4-basic", period: 4 },
  { suffix: "ot-basic", period: 5 },
];

function parseTeamPfFromQuarterTable(
  $: ReturnType<typeof cheerio.load>,
  table: cheerio.Element,
): number | null {
  return parsePfFromTable($, table);
}

/**
 * Parse quarter-by-quarter team fouls from cached BBR boxscore HTML.
 * Uses `table[id^="box-"][id$="-qN-basic"]` tfoot PF rows.
 */
export function parseBoxscorePeriodFouls(
  html: string,
  homeTeam: string,
  awayTeam: string,
): BoxscorePeriodFouls | null {
  if (!html.trim()) return null;

  const $ = cheerio.load(html);
  const buckets: { period: number; home: number; away: number }[] = [];

  for (const { suffix, period } of QUARTER_TABLE_SUFFIXES) {
    const homePf = parseTeamPfForSuffix($, homeTeam, suffix);
    const awayPf = parseTeamPfForSuffix($, awayTeam, suffix);
    if (homePf === null || awayPf === null) continue;
    buckets.push({ period, home: homePf, away: awayPf });
  }

  if (buckets.length < 2) return null;
  return { unit: "quarter", buckets };
}

function parseTeamPfForSuffix(
  $: ReturnType<typeof cheerio.load>,
  team: string,
  suffix: string,
): number | null {
  const bbrCodes = new Set<string>([team]);
  for (const [from, to] of Object.entries(BBR_TO_NBA)) {
    if (to === team) bbrCodes.add(from);
  }

  for (const code of bbrCodes) {
    const table = $(`table#box-${code}-${suffix}`).get(0);
    if (!table) continue;
    const pf = parseTeamPfFromQuarterTable($, table);
    if (pf !== null) return pf;
  }
  return null;
}

export function toWhistlePeriodSplits(
  parsed: BoxscorePeriodFouls,
): {
  unit: "quarter";
  buckets: { period: number; home: number; away: number }[];
  source: "boxscore";
} {
  return {
    unit: parsed.unit,
    buckets: parsed.buckets,
    source: "boxscore",
  };
}

export function bbrBoxscoreUrl(bbrGameId: string): string {
  return `https://www.basketball-reference.com/boxscores/${bbrGameId}.html`;
}

export function bbrBoxscoreCacheKey(bbrGameId: string): string {
  return `boxscore_${bbrGameId}`;
}
