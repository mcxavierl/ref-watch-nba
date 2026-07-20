#!/usr/bin/env npx tsx
/**
 * Backfill season-scoped elite metrics (archetype, leverage, consistency)
 * for the 2021-2026 officiating window.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { filterGamesForMatrixGeneration } from "./ingest/lib/matrix-record-schema";
import {
  backfillSeasonLabels,
  BACKFILL_MIN_SAMPLE_GAMES,
  buildSeasonOfficialStatsEntry,
  calculatedWhistleTotalsForSeason,
  databaseWhistleTotalsForSeason,
  hasSeasonOfficialStats,
  indexOfficialGamesBySeason,
  type BackfillErrorRecord,
  verifyFoulIntegrity,
} from "./lib/backfill-elite-metrics";
import { loadGameLogs } from "./lib/game-logs";
import type { LeagueId } from "../src/lib/leagues";
import type { RefProfile, RefStatsFile } from "../src/lib/types";

const ROOT = process.cwd();
const ERROR_LOG_PATH = path.join(ROOT, "logs", "backfill-errors.json");

const BACKFILL_LEAGUES: Array<{
  leagueId: LeagueId;
  dataLeague: "NBA" | "NFL" | "NHL" | "EPL" | "LALIGA" | "WNBA";
}> = [
  { leagueId: "nba", dataLeague: "NBA" },
  { leagueId: "nfl", dataLeague: "NFL" },
  { leagueId: "nhl", dataLeague: "NHL" },
  { leagueId: "epl", dataLeague: "EPL" },
  { leagueId: "laliga", dataLeague: "LALIGA" },
  { leagueId: "wnba", dataLeague: "WNBA" },
];

function statsPathForLeague(leagueId: LeagueId): string {
  if (leagueId === "nba") {
    return path.join(ROOT, "data", "ref-stats.json");
  }
  return path.join(ROOT, "data", leagueId, "ref-stats.json");
}

function corePathForLeague(leagueId: LeagueId): string | null {
  if (leagueId === "nba") {
    return path.join(ROOT, "data", "ref-stats-core.json");
  }
  return path.join(ROOT, "data", leagueId, "ref-stats-core.json");
}

function writeErrorLog(errors: BackfillErrorRecord[]): void {
  fs.mkdirSync(path.dirname(ERROR_LOG_PATH), { recursive: true });
  fs.writeFileSync(
    ERROR_LOG_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        errors,
      },
      null,
      2,
    )}\n`,
  );
}

function persistLeagueStats(
  leagueId: LeagueId,
  stats: RefStatsFile,
  updatedRefs: RefProfile[],
  generatedAt: string,
): void {
  const statsPath = statsPathForLeague(leagueId);
  const nextStats: RefStatsFile = {
    ...stats,
    refs: updatedRefs,
    meta: {
      ...stats.meta,
      lastUpdated: generatedAt,
    },
  };

  fs.writeFileSync(statsPath, `${JSON.stringify(nextStats, null, 2)}\n`);

  const corePath = corePathForLeague(leagueId);
  if (!corePath || !fs.existsSync(corePath)) return;

  const core = JSON.parse(fs.readFileSync(corePath, "utf8")) as {
    refs: RefProfile[];
    meta: RefStatsFile["meta"];
  };
  const bySlug = new Map(updatedRefs.map((ref) => [ref.slug, ref]));
  const nextCoreRefs = core.refs.map((ref) => {
    const fresh = bySlug.get(ref.slug);
    return fresh?.officialStatsBySeason
      ? { ...ref, officialStatsBySeason: fresh.officialStatsBySeason }
      : ref;
  });
  fs.writeFileSync(
    corePath,
    `${JSON.stringify({ ...core, refs: nextCoreRefs, meta: nextStats.meta }, null, 2)}\n`,
  );
}

export function runBackfillAnalytics2021To2026(root = ROOT): {
  processed: number;
  skipped: number;
  insufficient: number;
  errors: BackfillErrorRecord[];
} {
  const errors: BackfillErrorRecord[] = [];
  let processed = 0;
  let skipped = 0;
  let insufficient = 0;

  const previousRoot = process.cwd();
  process.chdir(root);
  try {
    for (const seasonLabel of backfillSeasonLabels()) {
      const seasonYear = seasonLabel.split("-")[0];
      console.log(`\n=== Processing season ${seasonYear} (${seasonLabel}) ===`);

      for (const { leagueId, dataLeague } of BACKFILL_LEAGUES) {
        const statsPath = statsPathForLeague(leagueId);
        if (!fs.existsSync(statsPath)) continue;

        const logs = loadGameLogs(dataLeague);
        if (!logs?.games?.length) continue;

        const stats = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;
        const { games: validatedGames } = filterGamesForMatrixGeneration(logs.games, leagueId);
        const seasonGames = validatedGames.filter((game) => game.season === seasonLabel);
        if (seasonGames.length === 0) continue;

        const gamesByOfficial = indexOfficialGamesBySeason(seasonGames);
        const officials = stats.refs.filter((profile) => gamesByOfficial.has(profile.slug));
        const generatedAt = new Date().toISOString();
        let progress = 0;

        const updatedRefs = stats.refs.map((profile) => {
          const officialSeasonGames = gamesByOfficial.get(profile.slug)?.get(seasonLabel) ?? [];
          if (officialSeasonGames.length === 0) return profile;

          progress += 1;
          console.log(
            `Processing ${seasonYear}: ${profile.name} | Progress: ${progress}/${officials.length}`,
          );

          if (hasSeasonOfficialStats(profile, seasonLabel)) {
            skipped += 1;
            return profile;
          }

          const calculated = calculatedWhistleTotalsForSeason(leagueId, officialSeasonGames);
          const database = databaseWhistleTotalsForSeason(leagueId, profile, seasonLabel);
          const integrity = verifyFoulIntegrity(
            calculated.fouls,
            database.fouls,
            calculated.games,
            database.games,
          );

          if (!integrity.ok) {
            console.warn(
              `WARNING ${leagueId} ${seasonLabel} ${profile.name}: foul integrity mismatch ` +
                `(calculated=${calculated.fouls}/${calculated.games}, ` +
                `database=${database.fouls}/${database.games})`,
            );
            errors.push({
              leagueId,
              season: seasonLabel,
              officialSlug: profile.slug,
              officialName: profile.name,
              reason: "foul_integrity_mismatch",
              calculatedFouls: calculated.fouls,
              databaseFouls: database.fouls,
              calculatedGames: calculated.games,
              databaseGames: database.games,
            });
            return profile;
          }

          const entry = buildSeasonOfficialStatsEntry(
            leagueId,
            seasonLabel,
            officialSeasonGames,
            generatedAt,
          );
          if (!entry) return profile;

          if (entry.status === "INSUFFICIENT_DATA") {
            insufficient += 1;
          } else {
            processed += 1;
          }

          return {
            ...profile,
            officialStatsBySeason: {
              ...(profile.officialStatsBySeason ?? {}),
              [seasonLabel]: entry,
            },
          };
        });

        persistLeagueStats(leagueId, stats, updatedRefs, generatedAt);
      }
    }
  } finally {
    process.chdir(previousRoot);
  }

  writeErrorLog(errors);
  return { processed, skipped, insufficient, errors };
}

function main(): void {
  console.log("=== Backfill elite analytics (2021-2026) ===");
  console.log(`Sample gate: ${BACKFILL_MIN_SAMPLE_GAMES}+ games per season`);

  const result = runBackfillAnalytics2021To2026();
  console.log(
    `\nDone. processed=${result.processed}, skipped=${result.skipped}, ` +
      `insufficient=${result.insufficient}, errors=${result.errors.length}`,
  );
  console.log(`Error log: ${ERROR_LOG_PATH}`);
}

if (import.meta.url.startsWith("file:")) {
  const executed = path.resolve(process.argv[1] ?? "");
  const modulePath = path.resolve(new URL(import.meta.url).pathname);
  if (executed === modulePath) {
    main();
  }
}
