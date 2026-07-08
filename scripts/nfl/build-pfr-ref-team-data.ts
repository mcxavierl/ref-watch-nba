#!/usr/bin/env npx tsx
/**
 * Scrape Pro-Football-Reference ref×team W-L via Jina (resume-safe).
 * Merges into data/nfl/ref-stats.json like NBA's BBR pipeline.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  applyBbrRefTeamStats,
  type ApplyBbrResult,
} from "../lib/apply-bbr-ref-team-stats";
import {
  countBbrRefTeamPairs,
  parseBbrRefereesMarkdown,
  type BbrRefTeamRecordsFile,
  type BbrRefTeamSeasonEntry,
} from "../../src/lib/bbr-ref-team-records";

const DATA_DIR = path.join(process.cwd(), "data", "nfl");
const FIXTURE_PATH = path.join(DATA_DIR, "pfr-ref-team-records.json");
const JINA = "https://r.jina.ai/";
const PAUSE_MS = 3500;
const TIMEOUT_MS = 90_000;

export const PFR_SEASONS = [
  "2021-22",
  "2022-23",
  "2023-24",
  "2024-25",
  "2025-26",
] as const;

export const PFR_TEAM_ABBRS = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN",
  "DET", "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA",
  "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB",
  "TEN", "WAS",
];

/** PFR franchise slug (not always same as abbr). */
const PFR_TEAM_SLUG: Record<string, string> = {
  ARI: "crd",
  ATL: "atl",
  BAL: "rav",
  BUF: "buf",
  CAR: "car",
  CHI: "chi",
  CIN: "cin",
  CLE: "cle",
  DAL: "dal",
  DEN: "den",
  DET: "det",
  GB: "gnb",
  HOU: "htx",
  IND: "clt",
  JAX: "jax",
  KC: "kan",
  LAC: "sdg",
  LAR: "ram",
  LV: "rai",
  MIA: "mia",
  MIN: "min",
  NE: "nwe",
  NO: "nor",
  NYG: "nyg",
  NYJ: "nyj",
  PHI: "phi",
  PIT: "pit",
  SEA: "sea",
  SF: "sfo",
  TB: "tam",
  TEN: "oti",
  WAS: "was",
};

function seasonLabelToPfrYear(season: string): number {
  return Number.parseInt(season.slice(0, 4), 10);
}

function pfrRefereesUrl(teamAbbr: string, pfrYear: number): string {
  const slug = PFR_TEAM_SLUG[teamAbbr] ?? teamAbbr.toLowerCase();
  return `https://www.pro-football-reference.com/teams/${slug}/${pfrYear}_referees.htm`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchMd(url: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${JINA}${url}`, {
        signal: ctrl.signal,
        headers: { Accept: "text/markdown" },
      });
      if (res.status === 429) {
        await sleep(Math.min(5000 * attempt, 60_000));
        continue;
      }
      if (!res.ok) {
        await sleep(3000 * attempt);
        continue;
      }
      const text = await res.text();
      if (/CAPTCHA|security verification|Just a moment/i.test(text)) {
        console.warn("  blocked by bot check");
        return null;
      }
      return text;
    } catch (err) {
      console.warn(`  fetch error attempt ${attempt}:`, err);
      await sleep(3000 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

function loadFixture(): BbrRefTeamRecordsFile | null {
  try {
    return JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8")) as BbrRefTeamRecordsFile;
  } catch {
    return null;
  }
}

function saveFixture(
  entries: BbrRefTeamSeasonEntry[],
  fetched: number,
  failed: number,
): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const fixture: BbrRefTeamRecordsFile = {
    lastUpdated: new Date().toISOString(),
    seasons: [...PFR_SEASONS],
    teams: [...PFR_TEAM_ABBRS],
    entries,
    stats: {
      pagesFetched: fetched,
      pagesFailed: failed,
      refTeamPairs: countBbrRefTeamPairs({
        lastUpdated: "",
        seasons: [...PFR_SEASONS],
        teams: [...PFR_TEAM_ABBRS],
        entries,
        stats: { pagesFetched: fetched, pagesFailed: failed, refTeamPairs: 0 },
      }),
    },
  };
  fs.writeFileSync(FIXTURE_PATH, `${JSON.stringify(fixture, null, 2)}\n`);
}

function loadNflRefStatsBase() {
  const statsPath = path.join(DATA_DIR, "ref-stats.json");
  const seedPath = path.join(DATA_DIR, "ref-stats.seed.json");
  try {
    return JSON.parse(fs.readFileSync(statsPath, "utf8"));
  } catch {
    return JSON.parse(fs.readFileSync(seedPath, "utf8"));
  }
}

async function scrapeFixture(skipExisting: boolean): Promise<BbrRefTeamRecordsFile> {
  const existing = loadFixture();
  const map = new Map<string, BbrRefTeamSeasonEntry>();
  for (const entry of existing?.entries ?? []) {
    map.set(`${entry.team}|${entry.season}`, entry);
  }

  let fetched = map.size;
  let failed = 0;
  const total = PFR_SEASONS.length * PFR_TEAM_ABBRS.length;
  let n = 0;

  for (const season of PFR_SEASONS) {
    const pfrYear = seasonLabelToPfrYear(season);
    for (const team of PFR_TEAM_ABBRS) {
      n++;
      const key = `${team}|${season}`;
      if (skipExisting && map.has(key)) {
        console.log(`[${n}/${total}] ${team} ${season} (skip)`);
        continue;
      }
      const url = pfrRefereesUrl(team, pfrYear);
      console.log(`[${n}/${total}] ${team} ${season}`);
      const md = await fetchMd(url);
      if (!md) {
        failed++;
        saveFixture([...map.values()], fetched, failed);
        await sleep(PAUSE_MS);
        continue;
      }
      const referees = parseBbrRefereesMarkdown(md);
      if (referees.length === 0) {
        console.warn("  parse failed");
        failed++;
        saveFixture([...map.values()], fetched, failed);
        await sleep(PAUSE_MS);
        continue;
      }
      map.set(key, { team, season, bbrYear: pfrYear, referees });
      fetched++;
      saveFixture([...map.values()], fetched, failed);
      console.log(`  ✓ ${referees.length} refs`);
      await sleep(PAUSE_MS);
    }
  }

  const entries = [...map.values()];
  saveFixture(entries, fetched, failed);
  return loadFixture()!;
}

function applyToNflStats(fixture: BbrRefTeamRecordsFile): ApplyBbrResult {
  const base = loadNflRefStatsBase();
  const result = applyBbrRefTeamStats(base, fixture);
  result.stats.meta.refTeamWinLossSource = "pro-football-reference";
  result.stats.meta.note =
    `Ref×team W-L from Pro-Football-Reference (${fixture.seasons.join(", ")}). ` +
    (base.meta.note ?? "");
  return result;
}

async function main(): Promise<void> {
  const skipScrape = process.argv.includes("--skip-scrape");
  const skipExisting = !process.argv.includes("--force");

  console.log("=== PFR NFL ref×team W-L build ===\n");

  let fixture = loadFixture();
  if (!skipScrape) {
    fixture = await scrapeFixture(skipExisting);
  } else if (!fixture || fixture.entries.length === 0) {
    console.error("No PFR fixture. Run without --skip-scrape first.");
    process.exit(1);
  }

  const { stats, matchedPairs, unmatchedReferees } = applyToNflStats(fixture!);
  fs.writeFileSync(
    path.join(DATA_DIR, "ref-stats.json"),
    `${JSON.stringify(stats, null, 2)}\n`,
  );

  console.log(`\nApplied ${matchedPairs} ref×team pairs to data/nfl/ref-stats.json`);
  if (unmatchedReferees.length > 0) {
    console.log(
      `Unmatched PFR officials (${unmatchedReferees.length}): ${unmatchedReferees.slice(0, 12).join(", ")}${unmatchedReferees.length > 12 ? "…" : ""}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
