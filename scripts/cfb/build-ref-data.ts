#!/usr/bin/env npx tsx
/**
 * CFB backfill from ESPN team schedules: scores, penalties, and officials when present.
 * Always writes game logs for live-conference games; ref stats only when crews are available.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { CFB_TEAM_ABBRS } from "../../src/lib/cfb/teams";
import {
  resolveGameConferenceTerritory,
  shouldIngestNcaaGame,
} from "../../src/lib/ncaa-conference-gate";
import type { RefStatsFile } from "../../src/lib/types";
import {
  CFB_CONFERENCE_SLUGS,
  isGameInConference,
  resolveConferenceSpec,
} from "./lib/conferences";
import {
  fetchCfbSummary,
  fetchTeamSchedule,
  normalizeName,
  sleep,
  toCfbOfficials,
} from "./lib/espn";
import { CFB_ESPN_TEAM_IDS } from "./lib/team-ids";
import { fetchOfficialsFromSummary } from "./lib/fetch-officials";
import {
  createIngestLogWriter,
  logOfficialsMissing,
} from "./lib/ingest-log";
import {
  buildRefStatsFromGames,
  gameLogFromSummary,
  summaryToExtractedGame,
  type CfbGameLogEntry,
} from "./lib/transform";
import type { CfbExtractedGame, CfbExtractedGamesFile } from "./lib/types";

const DATA_DIR = path.join(process.cwd(), "data", "cfb");
const STAGING_DIR = path.join(DATA_DIR, "staging");
const MIN_GAME_LOGS = 20;

/** ESPN calendar year for the season (2024 → 2024-25 CFB season). */
const DEFAULT_ESPN_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

const CONF_LABEL_TO_SLUG: Record<string, string> = {
  SEC: "sec",
  ACC: "acc",
  "Big Ten": "big-ten",
  "Big 12": "big-12",
};

function parseArgs(): { espnYears: number[]; limit?: number } {
  const argv = process.argv.slice(2);
  let espnYears = [...DEFAULT_ESPN_YEARS];
  let limit: number | undefined;

  for (const arg of argv) {
    if (arg.startsWith("--season=")) {
      const year = Number.parseInt(arg.slice("--season=".length), 10);
      if (!Number.isFinite(year)) {
        throw new Error(`Invalid --season value: ${arg}`);
      }
      espnYears = [year];
    }
    if (arg.startsWith("--limit=")) {
      limit = Number.parseInt(arg.slice("--limit=".length), 10);
      if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error(`Invalid --limit value: ${arg}`);
      }
    }
  }

  return { espnYears, limit };
}

function loadOfficialRoster(seed: RefStatsFile | null): Map<string, number> {
  const roster = new Map<string, number>();
  if (!seed) return roster;
  for (const ref of seed.refs) {
    roster.set(normalizeName(ref.name), ref.number);
  }
  return roster;
}

async function collectScheduleEvents(
  espnYears: number[],
): Promise<Map<string, { season: string; awayAbbr: string; homeAbbr: string }>> {
  const byId = new Map<
    string,
    { season: string; awayAbbr: string; homeAbbr: string }
  >();

  for (const espnYear of espnYears) {
    console.log(`Collecting ${espnYear} schedules...`);
    for (const abbr of CFB_TEAM_ABBRS) {
      const teamId = CFB_ESPN_TEAM_IDS[abbr];
      if (!teamId) {
        console.warn(`  missing ESPN id for ${abbr}`);
        continue;
      }
      for (const seasonType of [2, 3] as const) {
        await sleep(60);
        try {
          const events = await fetchTeamSchedule(teamId, espnYear, seasonType);
          for (const ev of events) {
            if (!byId.has(ev.eventId)) {
              byId.set(ev.eventId, {
                season: ev.season,
                awayAbbr: ev.awayAbbr,
                homeAbbr: ev.homeAbbr,
              });
            }
          }
        } catch (err) {
          console.warn(`  ${abbr} ${espnYear} t${seasonType}: ${err}`);
        }
      }
    }
    console.log(`  ${espnYear}: ${byId.size} unique tracked games so far`);
  }

  return byId;
}

function writeStagingFiles(
  extractedBySlug: Map<string, CfbExtractedGame[]>,
  totalIngested: number,
): void {
  for (const slug of CFB_CONFERENCE_SLUGS) {
    const spec = resolveConferenceSpec(slug);
    const games = extractedBySlug.get(slug) ?? [];
    const payload: CfbExtractedGamesFile = {
      generatedAt: new Date().toISOString(),
      conference: spec.label,
      conferenceSlug: spec.slug,
      dryRun: false,
      games,
      ingestedCount: totalIngested,
      expectedGames: spec.expectedGames,
    };
    const dir = path.join(STAGING_DIR, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "extracted-games.json"),
      `${JSON.stringify(payload, null, 2)}\n`,
    );
  }
}

async function buildFromEspn(input: {
  seed: RefStatsFile | null;
  espnYears: number[];
  limit?: number;
}): Promise<{
  stats: RefStatsFile;
  gameLogs: CfbGameLogEntry[];
  extractedBySlug: Map<string, CfbExtractedGame[]>;
} | null> {
  const roster = loadOfficialRoster(input.seed);
  const schedule = await collectScheduleEvents(input.espnYears);
  const ids = [...schedule.keys()];
  const toFetch = input.limit ? ids.slice(0, input.limit) : ids;
  console.log(`\nFetching ${toFetch.length} game summaries...`);

  const ingestLog = createIngestLogWriter();
  const gameLogs: CfbGameLogEntry[] = [];
  const extractedBySlug = new Map<string, CfbExtractedGame[]>(
    CFB_CONFERENCE_SLUGS.map((slug) => [slug, []]),
  );
  const conferenceCounts = new Map<string, number>();

  let processed = 0;
  let withOfficials = 0;
  let skippedNonLive = 0;
  let fetchErrors = 0;

  for (const eventId of toFetch) {
    const meta = schedule.get(eventId)!;
    await sleep(75);

    let summary;
    try {
      summary = await fetchCfbSummary(eventId, meta.season);
    } catch (err) {
      fetchErrors++;
      if (fetchErrors <= 5) console.warn(`Summary ${eventId}: ${err}`);
      continue;
    }
    if (!summary) continue;

    const trackedHome = CFB_TEAM_ABBRS.includes(summary.homeAbbr);
    const trackedAway = CFB_TEAM_ABBRS.includes(summary.awayAbbr);
    if (!trackedHome && !trackedAway) continue;

    if (!shouldIngestNcaaGame("cfb", summary.homeAbbr, summary.awayAbbr)) {
      skippedNonLive++;
      continue;
    }

    const conference = resolveGameConferenceTerritory(
      "cfb",
      summary.homeAbbr,
      summary.awayAbbr,
    );
    conferenceCounts.set(conference, (conferenceCounts.get(conference) ?? 0) + 1);

    const fetched = fetchOfficialsFromSummary(summary);
    let officials = toCfbOfficials(summary.officials, roster);
    if (fetched.officials.length > 0) {
      officials = toCfbOfficials(
        fetched.officials.map((o) => ({
          fullName: o.name,
          positionName: o.role,
        })),
        roster,
      );
      withOfficials++;
    } else {
      logOfficialsMissing(ingestLog, summary.gameId, conference);
    }

    const logEntry = gameLogFromSummary(summary, officials);
    gameLogs.push(logEntry);

    const extracted = summaryToExtractedGame(summary, fetched.officials);
    const slug = CONF_LABEL_TO_SLUG[conference];
    if (slug) {
      extractedBySlug.get(slug)?.push(extracted);
    }

    processed++;
    if (processed % 50 === 0) {
      console.log(`  processed ${processed} games (${withOfficials} with officials)...`);
    }
  }

  for (const [conference, count] of conferenceCounts) {
    ingestLog.logConference(conference, count);
  }
  ingestLog.flush();

  if (gameLogs.length < MIN_GAME_LOGS) {
    console.warn(
      `Only ${gameLogs.length} live-conference games — need at least ${MIN_GAME_LOGS}.`,
    );
    return null;
  }

  const stats = buildRefStatsFromGames({ gameLogs, roster });

  console.log(
    `\nIngest summary: ${processed} games, ${withOfficials} with officials, ` +
      `${processed - withOfficials} officials missing, ${skippedNonLive} skipped (non-live), ` +
      `${fetchErrors} fetch errors`,
  );

  return { stats, gameLogs, extractedBySlug };
}

async function main() {
  const { espnYears, limit } = parseArgs();
  const statsPath = path.join(DATA_DIR, "ref-stats.json");

  console.log("=== Ref Watch CFB data build (ESPN) ===");
  console.log(`Seasons: ${espnYears.join(", ")}${limit ? ` (limit ${limit} games)` : ""}\n`);

  const existingSeed = fs.existsSync(statsPath)
    ? (JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile)
    : null;

  const seed: RefStatsFile | null =
    existingSeed?.refs?.length && existingSeed.meta.source !== "espn"
      ? existingSeed
      : existingSeed?.refs?.length
        ? existingSeed
        : null;

  const built = await buildFromEspn({ seed, espnYears, limit });
  if (!built) {
    console.log("ESPN backfill insufficient — no output written.");
    process.exit(1);
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(statsPath, `${JSON.stringify(built.stats, null, 2)}\n`);
  fs.writeFileSync(
    path.join(DATA_DIR, "game-logs.json"),
    `${JSON.stringify(
      {
        lastUpdated: new Date().toISOString(),
        league: "CFB",
        source: "espn",
        games: built.gameLogs,
      },
      null,
      2,
    )}\n`,
  );

  writeStagingFiles(built.extractedBySlug, built.gameLogs.length);

  const { splitRefStatsForDeploy } = await import("../lib/split-ref-stats");
  const split = splitRefStatsForDeploy(built.stats);
  fs.writeFileSync(
    path.join(DATA_DIR, "ref-stats-core.json"),
    `${JSON.stringify(split.core, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "team-splits.json"),
    `${JSON.stringify(split.teamSplits, null, 2)}\n`,
  );

  const { computeLeagueBaselines, loadBaselines, saveBaselines } = await import(
    "../lib/baselines"
  );
  const existing = loadBaselines();
  if (existing) {
    existing.CFB = computeLeagueBaselines("CFB", built.gameLogs);
    existing.generatedAt = new Date().toISOString();
    saveBaselines(existing);
  }

  console.log(
    `\nBuilt ${built.stats.meta.totalGamesProcessed} ESPN games → ` +
      `${built.stats.refs.length} officials (${built.stats.meta.source})`,
  );
  console.log(`Team splits: ${Object.keys(built.stats.teamSplits).length} programs`);
  console.log(`Game logs: ${built.gameLogs.length} matches → data/cfb/game-logs.json`);

  for (const slug of CFB_CONFERENCE_SLUGS) {
    const spec = resolveConferenceSpec(slug);
    const games = built.extractedBySlug.get(slug) ?? [];
    const inConf = games.filter((g) =>
      isGameInConference(g, spec),
    ).length;
    console.log(`  staging/${slug}: ${inConf} games`);
  }

  if (built.stats.refs.length === 0) {
    console.log(
      "\nNote: ESPN CFB summaries did not include officials — ref profiles empty. " +
        "Game logs and pace metrics are still available.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
