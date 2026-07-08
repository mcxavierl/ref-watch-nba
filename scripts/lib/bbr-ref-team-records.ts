import * as fs from "node:fs";
import * as path from "node:path";
import * as cheerio from "cheerio";
import { BROWSER_HEADERS } from "./nba-headers";
import {
  bbrYearToSeasonLabel,
  seasonLabelToBbrYear,
  type BbrRefTeamRecordsFile,
  type BbrRefTeamSeasonEntry,
  type BbrRefTeamSeasonRow,
} from "../../src/lib/bbr-ref-team-records";

const BBR_HEADERS: Record<string, string> = {
  ...BROWSER_HEADERS,
  Referer: "https://www.basketball-reference.com/",
};

const BBR_BASE = "https://www.basketball-reference.com";
const REQUEST_DELAY_MS = 1500;
const MAX_RETRIES = 5;
const FETCH_TIMEOUT_MS = 30_000;
const RATE_LIMIT_BASE_MS = 60_000;
const RATE_LIMIT_MAX_MS = 300_000;

/** NBA abbr → alternate Basketball-Reference franchise codes. */
const BBR_TEAM_SLUG_ALIASES: Record<string, string[]> = {
  BKN: ["BRK"],
  CHA: ["CHO"],
  PHX: ["PHO"],
};

export const BBR_SEASONS = [
  "2021-22",
  "2022-23",
  "2023-24",
  "2024-25",
  "2025-26",
] as const;

export const BBR_TEAM_ABBRS = [
  "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
];

function bbrTeamSlugs(team: string): string[] {
  const abbr = team.toUpperCase();
  return [abbr, ...(BBR_TEAM_SLUG_ALIASES[abbr] ?? [])];
}

function bbrRefereesUrl(teamSlug: string, bbrYear: number): string {
  return `${BBR_BASE}/teams/${teamSlug}/${bbrYear}_referees.html`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url: string): Promise<string | null> {
  let rateLimitWaits = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: BBR_HEADERS,
        signal: controller.signal,
      });
      if (res.status === 429) {
        rateLimitWaits++;
        const waitMs = Math.min(
          RATE_LIMIT_BASE_MS * rateLimitWaits,
          RATE_LIMIT_MAX_MS,
        );
        console.warn(`  Rate limited (429); waiting ${waitMs / 1000}s...`);
        await sleep(waitMs);
        attempt--;
        continue;
      }
      if (!res.ok) {
        if (res.status === 404) return null;
        console.warn(`  HTTP ${res.status} for ${url} (attempt ${attempt})`);
        if (attempt < MAX_RETRIES) await sleep(REQUEST_DELAY_MS * attempt);
        continue;
      }
      return await res.text();
    } catch (err) {
      console.warn(`  Fetch error for ${url} (attempt ${attempt}):`, err);
      if (attempt < MAX_RETRIES) await sleep(REQUEST_DELAY_MS * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

export function parseBbrRefereesTable(html: string): BbrRefTeamSeasonRow[] {
  const $ = cheerio.load(html);
  const table = $("#refs-summary");
  if (!table.length) return [];

  const rows: BbrRefTeamSeasonRow[] = [];
  table.find("tbody tr").each((_, tr) => {
    const refereeCell = $(tr).find('[data-stat="referee"]');
    const referee =
      refereeCell.find("a").text().trim() || refereeCell.text().trim();
    if (!referee) return;

    const games = Number.parseInt($(tr).find('[data-stat="g"]').text().trim(), 10);
    const wins = Number.parseInt($(tr).find('[data-stat="wins"]').text().trim(), 10);
    const losses = Number.parseInt(
      $(tr).find('[data-stat="losses"]').text().trim(),
      10,
    );
    if (!Number.isFinite(games) || games <= 0) return;

    rows.push({
      referee,
      games,
      wins: Number.isFinite(wins) ? wins : 0,
      losses: Number.isFinite(losses) ? losses : Math.max(0, games - (wins || 0)),
    });
  });
  return rows;
}

export interface ScrapeBbrOptions {
  seasons?: string[];
  teams?: string[];
  /** Reuse existing fixture entries when present (faster re-apply). */
  existing?: BbrRefTeamRecordsFile;
  /** Persist partial progress after each page. */
  outputPath?: string;
}

export async function scrapeBbrRefTeamRecords(
  options: ScrapeBbrOptions = {},
): Promise<BbrRefTeamRecordsFile> {
  const seasons = options.seasons ?? [...BBR_SEASONS];
  const teams = options.teams ?? [...BBR_TEAM_ABBRS];
  const existingMap = new Map<string, BbrRefTeamSeasonEntry>();
  for (const entry of options.existing?.entries ?? []) {
    existingMap.set(`${entry.team}|${entry.season}`, entry);
  }

  const entries: BbrRefTeamSeasonEntry[] = [...(options.existing?.entries ?? [])];
  let pagesFetched = options.existing?.stats.pagesFetched ?? 0;
  let pagesFailed = options.existing?.stats.pagesFailed ?? 0;
  const pairKeys = new Set<string>();
  for (const entry of entries) {
    for (const row of entry.referees) {
      pairKeys.add(`${row.referee}|${entry.team}`);
    }
  }

  const totalPages = seasons.length * teams.length;
  let pageNum = 0;

  const persist = () => {
    if (!options.outputPath) return;
    saveBbrRefTeamRecords(
      {
        lastUpdated: new Date().toISOString(),
        seasons,
        teams,
        entries,
        stats: {
          pagesFetched,
          pagesFailed,
          refTeamPairs: pairKeys.size,
        },
      },
      options.outputPath,
      { quiet: true },
    );
  };

  for (const season of seasons) {
    const bbrYear = seasonLabelToBbrYear(season);
    for (const team of teams) {
      pageNum++;
      const cacheKey = `${team}|${season}`;
      if (existingMap.has(cacheKey)) {
        console.log(`  [${pageNum}/${totalPages}] ${team} ${season} (cached)`);
        continue;
      }

      let html: string | null = null;
      let usedSlug = team;
      for (const slug of bbrTeamSlugs(team)) {
        const url = bbrRefereesUrl(slug, bbrYear);
        console.log(`  [${pageNum}/${totalPages}] ${team} ${season} → ${url}`);
        html = await fetchHtml(url);
        if (html) {
          usedSlug = slug;
          break;
        }
        if (slug !== team) {
          console.warn(`  ${team} ${season}: slug ${slug} unavailable, trying next`);
        }
      }

      if (!html) {
        pagesFailed++;
        persist();
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const referees = parseBbrRefereesTable(html);
      pagesFetched++;
      for (const row of referees) {
        pairKeys.add(`${row.referee}|${team}`);
      }
      const entry: BbrRefTeamSeasonEntry = {
        team,
        season,
        bbrYear,
        referees,
      };
      entries.push(entry);
      existingMap.set(cacheKey, entry);
      if (usedSlug !== team) {
        console.log(`  ${team} ${season}: fetched via BBR slug ${usedSlug}`);
      }
      persist();
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return {
    lastUpdated: new Date().toISOString(),
    seasons,
    teams,
    entries,
    stats: {
      pagesFetched,
      pagesFailed,
      refTeamPairs: pairKeys.size,
    },
  };
}

export function saveBbrRefTeamRecords(
  fixture: BbrRefTeamRecordsFile,
  filePath?: string,
  opts?: { quiet?: boolean },
): void {
  const out =
    filePath ?? path.join(process.cwd(), "data", "bbr-ref-team-records.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(fixture, null, 2));
  if (!opts?.quiet) {
    console.log(
      `BBR fixture: ${fixture.entries.length} team-seasons, ${fixture.stats.refTeamPairs} ref×team pairs (${fixture.stats.pagesFetched} fetched, ${fixture.stats.pagesFailed} failed)`,
    );
  }
}

export function loadBbrRefTeamRecords(
  filePath?: string,
): BbrRefTeamRecordsFile | null {
  const p =
    filePath ?? path.join(process.cwd(), "data", "bbr-ref-team-records.json");
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as BbrRefTeamRecordsFile;
  } catch {
    return null;
  }
}

export { bbrYearToSeasonLabel };
