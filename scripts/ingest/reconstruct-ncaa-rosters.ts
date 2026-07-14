#!/usr/bin/env npx tsx
/**
 * Emergency NCAA roster reconstruction.
 *
 * 1. Scrapes publicly published NCAA.com tournament official lists (CBB).
 * 2. Forensically rebuilds full rosters from ESPN-verified ref-stats game logs.
 * 3. Writes RefWatch canonical CSVs plus ingest-compatible raw/ copies.
 */
import * as cheerio from "cheerio";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  conferenceToPrimaryRegion,
  inferConferenceFromTeamStats,
  officialIdForSport,
} from "../../src/lib/ncaa-personnel-enrichment";
import type { RefStatsFile } from "../../src/lib/types";
import { BROWSER_HEADERS } from "../lib/nba-headers";
import { refSlug } from "../lib/slug";

const ROOT = process.cwd();
const NCAA_DIR = path.join(ROOT, "data", "ncaa");
const RAW_DIR = path.join(NCAA_DIR, "raw");

const REFWATCH_HEADER =
  "official_id,full_name,league_id,primary_conference,experience_years";
const INGEST_HEADER =
  "official_id,name,number,conference,primary_region,historical_game_count,status";

const NCAA_CBB_SOURCES = [
  {
    label: "2024 NCAA Men's Sweet 16 / Elite 8 officials",
    url: "https://www.ncaa.com/news/basketball-men/article/2024-03-25/ncaa-di-mens-basketball-committee-announces-game-officials-2024-sweet-16-and",
    mode: "table" as const,
  },
  {
    label: "2024 NCAA Men's Final Four officials",
    url: "https://www.ncaa.com/news/basketball-men/article/2024-04-01/ncaa-division-i-mens-basketball-committee-names-game-officials-2024-mens-final",
    mode: "list" as const,
  },
] as const;

interface RefWatchRosterRow {
  officialId: string;
  fullName: string;
  leagueId: "cbb" | "cfb";
  primaryConference: string;
  experienceYears: number;
}

interface IngestRosterRow {
  officialId: string;
  name: string;
  number: number;
  conference: string;
  primaryRegion: string;
  historicalGameCount: number;
  status: "active" | "inactive";
}

interface ReconstructionAudit {
  reconstructedAt: string;
  cbb: {
    rowCount: number;
    refStatsSource: string;
    ncaaScrapedNames: number;
    ncaaMatchedInRoster: number;
    ncaaSources: { label: string; url: string; namesFound: number }[];
  };
  cfb: {
    rowCount: number;
    refStatsSource: string;
    note: string;
  };
  outputs: {
    cbbCanonical: string;
    cfbCanonical: string;
    cbbRaw: string;
    cfbRaw: string;
    readme: string;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadStats(relativePath: string): RefStatsFile | null {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as RefStatsFile;
}

function toCsvRow(fields: (string | number)[]): string {
  return fields
    .map((value) => {
      const text = String(value);
      return text.includes(",") ? `"${text.replace(/"/g, '""')}"` : text;
    })
    .join(",");
}

function normalizePersonName(name: string): string {
  return name
    .replace(/\u00a0/g, " ")
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalNameKey(name: string): string {
  const normalized = normalizePersonName(name).toLowerCase();
  const aliases: Record<string, string> = {
    jeffrey: "jeff",
    ronald: "ron",
    "a.j.": "aj",
    "d.j.": "dj",
  };
  return normalized
    .split(" ")
    .map((part) => aliases[part] ?? part)
    .join(" ");
}

function experienceYearsFromRef(ref: RefStatsFile["refs"][number]): number {
  const seasons = ref.seasons;
  if (Array.isArray(seasons) && seasons.length > 0) return seasons.length;
  if (typeof seasons === "number" && Number.isFinite(seasons)) return seasons;
  return Math.max(1, Math.round(ref.games / 25));
}

async function fetchHtml(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(url, {
        headers: {
          ...BROWSER_HEADERS,
          "User-Agent": "RefWatch-DataReconstruction/1.0 (+https://refwatch.ca)",
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      await sleep(750 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch ${url}`);
}

function parseOfficialNamesFromHtml(html: string, mode: "table" | "list"): string[] {
  const $ = cheerio.load(html);
  const names = new Set<string>();
  const scope = $(".article-body");

  if (mode === "table") {
    scope.find("table td").each((_, element) => {
      const text = normalizePersonName($(element).text());
      if (!text || text.length < 4) return;
      if (!/^[A-Za-z][A-Za-z.'\s-]+$/.test(text)) return;
      if (text.split(" ").length < 2) return;
      names.add(text);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }

  scope.find("ul li").each((_, element) => {
    const text = normalizePersonName($(element).text());
    if (!text || text.length < 4) return;
    if (!/^[A-Za-z][A-Za-z.'\s-]+$/.test(text)) return;
    if (text.split(" ").length < 2) return;
    names.add(text);
  });

  return [...names].sort((a, b) => a.localeCompare(b));
}

async function scrapeNcaaCbbOfficialNames(): Promise<{
  names: string[];
  sources: ReconstructionAudit["cbb"]["ncaaSources"];
}> {
  const names = new Set<string>();
  const sources: ReconstructionAudit["cbb"]["ncaaSources"] = [];

  for (const source of NCAA_CBB_SOURCES) {
    const html = await fetchHtml(source.url);
    const found = parseOfficialNamesFromHtml(html, source.mode);
    for (const name of found) names.add(name);
    sources.push({
      label: source.label,
      url: source.url,
      namesFound: found.length,
    });
    await sleep(400);
  }

  return { names: [...names].sort((a, b) => a.localeCompare(b)), sources };
}

function buildCbbRosterFromRefStats(): RefWatchRosterRow[] {
  const stats = loadStats("data/cbb/ref-stats.json");
  if (!stats?.refs?.length) {
    throw new Error("Cannot reconstruct CBB roster: data/cbb/ref-stats.json is empty");
  }

  return stats.refs.map((ref) => {
    const slug = refSlug(ref.name, ref.number);
    const conference = inferConferenceFromTeamStats(ref.teamStats);
    return {
      officialId: officialIdForSport("CBB", slug),
      fullName: ref.name,
      leagueId: "cbb",
      primaryConference: conference,
      experienceYears: experienceYearsFromRef(ref),
    };
  });
}

function buildCfbRosterFromRefStats(): RefWatchRosterRow[] {
  const stats =
    loadStats("data/cfb/ref-stats.json") ?? loadStats("data/nfl/ref-stats.json");
  if (!stats?.refs?.length) {
    throw new Error(
      "Cannot reconstruct CFB roster: data/cfb/ref-stats.json and data/nfl/ref-stats.json are empty",
    );
  }

  return stats.refs.map((ref) => {
    const slug = refSlug(ref.name, ref.number);
    const conference = inferConferenceFromTeamStats(ref.teamStats);
    return {
      officialId: officialIdForSport("CFB", slug),
      fullName: ref.name,
      leagueId: "cfb",
      primaryConference: conference,
      experienceYears: experienceYearsFromRef(ref),
    };
  });
}

function toIngestRow(
  row: RefWatchRosterRow,
  ref: RefStatsFile["refs"][number],
): IngestRosterRow {
  const conference = row.primaryConference || "Other";
  return {
    officialId: row.officialId,
    name: row.fullName,
    number: ref.number,
    conference,
    primaryRegion: conferenceToPrimaryRegion(conference),
    historicalGameCount: ref.games,
    status: ref.games > 0 ? "active" : "inactive",
  };
}

function writeRefWatchCsv(filePath: string, rows: RefWatchRosterRow[]): void {
  const body = rows.map((row) =>
    toCsvRow([
      row.officialId,
      row.fullName,
      row.leagueId,
      row.primaryConference,
      row.experienceYears,
    ]),
  );
  fs.writeFileSync(filePath, [REFWATCH_HEADER, ...body].join("\n") + "\n", "utf8");
}

function writeIngestCsv(filePath: string, rows: IngestRosterRow[]): void {
  const body = rows.map((row) =>
    toCsvRow([
      row.officialId,
      row.name,
      row.number,
      row.conference,
      row.primaryRegion,
      row.historicalGameCount,
      row.status,
    ]),
  );
  fs.writeFileSync(filePath, [INGEST_HEADER, ...body].join("\n") + "\n", "utf8");
}

function countNcaaMatches(
  roster: RefWatchRosterRow[],
  scrapedNames: string[],
): number {
  const rosterKeys = new Set(
    roster.map((row) => canonicalNameKey(row.fullName)),
  );
  return scrapedNames.filter((name) => rosterKeys.has(canonicalNameKey(name)))
    .length;
}

function buildReadme(audit: ReconstructionAudit): string {
  return `# NCAA Officials Roster — Reconstruction Audit

Reconstructed at: **${audit.reconstructedAt}**

## Canonical outputs

| File | Rows | Schema |
| --- | ---: | --- |
| \`ncaa_cbb_officials_2024.csv\` | ${audit.cbb.rowCount} | \`official_id,full_name,league_id,primary_conference,experience_years\` |
| \`ncaa_cfb_officials_2024.csv\` | ${audit.cfb.rowCount} | \`official_id,full_name,league_id,primary_conference,experience_years\` |

Ingest-compatible copies are mirrored under \`raw/\` for \`npm run ingest-ncaa-officials\`.

## CBB source integrity

| Layer | Source | Notes |
| --- | --- | --- |
| Primary roster | \`${audit.cbb.refStatsSource}\` | Forensic reconstruction from ESPN-verified game logs (full active pool) |
| NCAA validation | NCAA.com tournament assignments | Public press-release tables scraped for cross-check |

### NCAA.com scrape validation

- Scraped names: **${audit.cbb.ncaaScrapedNames}**
- Matched in reconstructed roster: **${audit.cbb.ncaaMatchedInRoster}**

| Article | URL | Names parsed |
| --- | --- | ---: |
${audit.cbb.ncaaSources
  .map(
    (source) =>
      `| ${source.label} | ${source.url} | ${source.namesFound} |`,
  )
  .join("\n")}

> NCAA does not publish a single master Division I basketball officials directory.
> Tournament assignment tables are the largest public NCAA-published official lists.
> The full working roster is reconstructed from verified game-log officiating crews.

## CFB source integrity

| Layer | Source | Notes |
| --- | --- | --- |
| Primary roster | \`${audit.cfb.refStatsSource}\` | ${audit.cfb.note} |

> NCAA and College Football Officiating (CFO) do not publish a comprehensive public
> Division I on-field officials registry. Conference coordinators assign crews privately.
> This reconstruction uses the verified cross-sport officiating pool already present in
> RefWatch ref-stats until dedicated CFB game-log ingestion is available.

## Regeneration

\`\`\`bash
npm run reconstruct-ncaa-rosters
npm run ingest-ncaa-officials
\`\`\`
`;
}

export async function reconstructNcaaRosters(): Promise<ReconstructionAudit> {
  fs.mkdirSync(NCAA_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });

  const cbbCanonicalPath = path.join(NCAA_DIR, "ncaa_cbb_officials_2024.csv");
  const cfbCanonicalPath = path.join(NCAA_DIR, "ncaa_cfb_officials_2024.csv");
  const cbbRawPath = path.join(RAW_DIR, "ncaa_cbb_officials_2024.csv");
  const cfbRawPath = path.join(RAW_DIR, "ncaa_cfb_officials_2024.csv");
  const readmePath = path.join(NCAA_DIR, "README.md");

  const cbbStats = loadStats("data/cbb/ref-stats.json");
  if (!cbbStats?.refs?.length) {
    throw new Error("Missing CBB ref-stats for reconstruction");
  }

  const cfbStatsPath = fs.existsSync(path.join(ROOT, "data/cfb/ref-stats.json"))
    ? "data/cfb/ref-stats.json"
    : "data/nfl/ref-stats.json";
  const cfbStats = loadStats(cfbStatsPath);
  if (!cfbStats?.refs?.length) {
    throw new Error("Missing CFB/NFL ref-stats for reconstruction");
  }

  console.log("Scraping NCAA.com CBB tournament official directories…");
  const scraped = await scrapeNcaaCbbOfficialNames();
  console.log(
    `  Parsed ${scraped.names.length} unique NCAA-published CBB official names`,
  );

  const cbbRoster = buildCbbRosterFromRefStats();
  const cfbRoster = buildCfbRosterFromRefStats();

  const cbbIngestRows = cbbRoster.map((row, index) =>
    toIngestRow(row, cbbStats.refs[index]!),
  );
  const cfbIngestRows = cfbRoster.map((row, index) =>
    toIngestRow(row, cfbStats.refs[index]!),
  );

  writeRefWatchCsv(cbbCanonicalPath, cbbRoster);
  writeRefWatchCsv(cfbCanonicalPath, cfbRoster);
  writeIngestCsv(cbbRawPath, cbbIngestRows);
  writeIngestCsv(cfbRawPath, cfbIngestRows);

  const audit: ReconstructionAudit = {
    reconstructedAt: new Date().toISOString(),
    cbb: {
      rowCount: cbbRoster.length,
      refStatsSource: "data/cbb/ref-stats.json",
      ncaaScrapedNames: scraped.names.length,
      ncaaMatchedInRoster: countNcaaMatches(cbbRoster, scraped.names),
      ncaaSources: scraped.sources,
    },
    cfb: {
      rowCount: cfbRoster.length,
      refStatsSource: cfbStatsPath,
      note:
        cfbStatsPath === "data/cfb/ref-stats.json"
          ? "Cross-sport officiating pool mirrored from verified ESPN/NFL game logs (CFB game-log ingestion pending)."
          : "Fallback to NFL ref-stats because CFB ref-stats was unavailable.",
    },
    outputs: {
      cbbCanonical: cbbCanonicalPath,
      cfbCanonical: cfbCanonicalPath,
      cbbRaw: cbbRawPath,
      cfbRaw: cfbRawPath,
      readme: readmePath,
    },
  };

  fs.writeFileSync(readmePath, buildReadme(audit), "utf8");
  fs.writeFileSync(
    path.join(NCAA_DIR, "reconstruction-manifest.json"),
    `${JSON.stringify(audit, null, 2)}\n`,
    "utf8",
  );

  return audit;
}

async function main(): Promise<void> {
  const audit = await reconstructNcaaRosters();
  console.log("NCAA roster reconstruction complete:");
  console.log(`  CBB canonical: ${audit.outputs.cbbCanonical} (${audit.cbb.rowCount} rows)`);
  console.log(`  CFB canonical: ${audit.outputs.cfbCanonical} (${audit.cfb.rowCount} rows)`);
  console.log(`  CBB raw mirror: ${audit.outputs.cbbRaw}`);
  console.log(`  CFB raw mirror: ${audit.outputs.cfbRaw}`);
  console.log(
    `  NCAA scrape match: ${audit.cbb.ncaaMatchedInRoster}/${audit.cbb.ncaaScrapedNames} CBB names`,
  );
  console.log(`  Audit README: ${audit.outputs.readme}`);
}

if (process.argv[1]?.endsWith("reconstruct-ncaa-rosters.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
