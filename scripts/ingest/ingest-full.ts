#!/usr/bin/env npx tsx
/**
 * Full cold NBA ingest: BBR schedule/standings/playoffs/ref-index + NBA Stats officials.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { normalizeRefName } from "../../src/lib/bbr-ref-team-records";
import { fetchBbrHtml } from "./fetch-bbr";
import {
  fetchGameSummary,
  fetchSeasonGameIds,
  appendIngestLog,
} from "./fetch-nba-stats";
import {
  INGEST_SEASONS,
  BBR_REF_INDEX_URL,
  bbrPlayoffsUrl,
  bbrScheduleUrl,
  bbrStandingsUrl,
  INGEST_LOG_PATH,
  DISCREPANCIES_PATH,
} from "./config";
import { parseBbrSchedule, parseBbrPlayoffs } from "./parse-schedule";
import { parseBbrStandings } from "./parse-standings";
import {
  buildRefIndexMap,
  parseBbrBoxScoreOfficials,
  parseBbrRefIndex,
} from "./parse-ref-index";
import { attachOfficials, matchBbrToNba, type MergedGame } from "./merge-games";
import {
  assertAllPassed,
  runAllValidations,
  writeDiscrepancies,
  writeManifest,
} from "./validate";
import { writeSeasonShards } from "./write";
import { buildRefStatsFromLogs } from "./build-ref-stats-from-logs";

function gameMatchKey(date: string, home: string, away: string): string {
  return `${date}|${home}|${away}`;
}

async function fetchBbrBoxOfficials(url: string): Promise<string[]> {
  if (!url) return [];
  const slug = url.split("/").pop()?.replace(".html", "") ?? url;
  const html = await fetchBbrHtml(url, `boxscore_${slug}`);
  return parseBbrBoxScoreOfficials(html);
}

async function main() {
  console.log("=== NBA full cold ingest ===\n");

  fs.mkdirSync(path.dirname(INGEST_LOG_PATH), { recursive: true });
  if (fs.existsSync(INGEST_LOG_PATH)) fs.unlinkSync(INGEST_LOG_PATH);
  if (fs.existsSync(DISCREPANCIES_PATH)) fs.unlinkSync(DISCREPANCIES_PATH);

  let pagesFetched = 0;

  // 1. BBR ref index
  console.log("Fetching BBR ref index...");
  const refIndexHtml = await fetchBbrHtml(BBR_REF_INDEX_URL, "ref_index");
  pagesFetched++;
  const refEntries = parseBbrRefIndex(refIndexHtml);
  const refIndex = buildRefIndexMap(refEntries);
  console.log(`  ${refEntries.length} referees in index`);

  // 2. BBR schedules + standings + playoffs
  const bbrGames: ReturnType<typeof parseBbrSchedule> = [];
  const standingsHtmlBySeason: Record<string, string> = {};

  for (const season of INGEST_SEASONS) {
    console.log(`Fetching BBR pages for ${season}...`);
    const schedHtml = await fetchBbrHtml(
      bbrScheduleUrl(season),
      `schedule_${season}`,
    );
    pagesFetched++;
    const sched = parseBbrSchedule(schedHtml, season);
    bbrGames.push(...sched);
    console.log(`  schedule: ${sched.length} games`);

    const standingsHtml = await fetchBbrHtml(
      bbrStandingsUrl(season),
      `standings_${season}`,
    );
    pagesFetched++;
    standingsHtmlBySeason[season] = standingsHtml;

    const playoffsHtml = await fetchBbrHtml(
      bbrPlayoffsUrl(season),
      `playoffs_${season}`,
    );
    pagesFetched++;
    const playoffGames = parseBbrPlayoffs(playoffsHtml, season);
    console.log(`  playoffs: ${playoffGames.length} games (excluded from regular-season shards)`);
  }

  const regularBbr = bbrGames.filter((g) => !g.isPlayoff);
  console.log(`\nBBR regular-season games: ${regularBbr.length}`);

  // 3. NBA Stats game IDs + summaries
  const nbaByKey = new Map<
    string,
    {
      gameId: string;
      date: string;
      homeTeam: string;
      awayTeam: string;
      homeScore: number;
      awayScore: number;
    }
  >();
  const officialsByGameId = new Map<
    string,
    { officials: { name: string; number: number }[]; source: MergedGame["officialsSource"] }
  >();

  let nbaCalls = 0;
  let fallbacks = 0;

  for (const season of INGEST_SEASONS) {
    console.log(`\nNBA Stats game IDs for ${season}...`);
    const gameIds = await fetchSeasonGameIds(season);
    nbaCalls++;
    console.log(`  ${gameIds.length} game IDs`);

    let processed = 0;
    for (const gameId of gameIds) {
      const summary = await fetchGameSummary(gameId);
      nbaCalls++;
      processed++;

      if (!summary || summary.httpStatus >= 400) {
        appendIngestLog({
          at: new Date().toISOString(),
          event: "nba_stats_error",
          gameId,
          status: summary?.httpStatus ?? 0,
        });
        continue;
      }

      if (
        !summary.date ||
        !summary.homeTeam ||
        !summary.awayTeam
      ) {
        continue;
      }

      const key = gameMatchKey(
        summary.date,
        summary.homeTeam,
        summary.awayTeam,
      );
      nbaByKey.set(key, {
        gameId,
        date: summary.date,
        homeTeam: summary.homeTeam,
        awayTeam: summary.awayTeam,
        homeScore: summary.homeScore,
        awayScore: summary.awayScore,
      });

      let officials = summary.officials;
      let source: MergedGame["officialsSource"] = "nba-stats-api";

      if (officials.length !== 3) {
        const bbr = regularBbr.find(
          (g) =>
            g.date === summary.date &&
            g.homeTeam === summary.homeTeam &&
            g.awayTeam === summary.awayTeam,
        );
        if (bbr?.boxScoreUrl) {
          const bbrNames = await fetchBbrBoxOfficials(bbr.boxScoreUrl);
          pagesFetched++;
          officials = bbrNames.map((name) => {
            const idx = refIndex.get(normalizeRefName(name));
            return { name, number: idx?.number ?? 0 };
          });
          source = "bbr-boxscore";
          fallbacks++;
          appendIngestLog({
            at: new Date().toISOString(),
            event: "officials_fallback",
            gameId,
            bbrGameId: bbr.bbrGameId,
            officials: bbrNames,
            reason:
              summary.officials.length === 0
                ? "empty_nba_stats"
                : `count_${summary.officials.length}`,
          });
        }
      }

      officialsByGameId.set(gameId, { officials, source });

      if (processed % 100 === 0) {
        console.log(`  ${season}: ${processed}/${gameIds.length} summaries fetched`);
      }
    }
  }

  console.log(`\nNBA Stats API calls: ${nbaCalls}`);
  console.log(`Officials BBR fallbacks: ${fallbacks}`);

  // 4. Cross-verify and merge
  const { merged: matched, discrepancies } = matchBbrToNba(regularBbr, nbaByKey);
  writeDiscrepancies(discrepancies);

  const finalGames: MergedGame[] = matched.map((game) => {
    const off = officialsByGameId.get(game.gameId);
    return attachOfficials(
      game,
      off?.officials ?? [],
      off?.source ?? "nba-stats-api",
    );
  });

  // 5. Validate
  console.log("\nRunning validation checks...");
  const results = runAllValidations(
    finalGames,
    discrepancies,
    refIndex,
    standingsHtmlBySeason,
  );

  for (const r of results) {
    console.log(`  [${r.passed ? "PASS" : "FAIL"}] ${r.check}: ${r.detail}`);
  }

  assertAllPassed(results);

  // 6. Write output
  writeSeasonShards(finalGames);
  writeManifest(finalGames, pagesFetched);

  const stats = buildRefStatsFromLogs();
  const statsPath = path.join(process.cwd(), "data", "ref-stats.json");
  fs.writeFileSync(statsPath, `${JSON.stringify(stats, null, 2)}\n`);

  console.log("\n=== INGEST COMPLETE ===");
  console.log(`Pages fetched: ${pagesFetched}`);
  console.log(`Discrepancies: ${discrepancies.length}`);
  console.log(`Fallbacks: ${fallbacks}`);
  console.log(`Games written: ${finalGames.length}`);
  console.log(`Validation: ALL PASSED`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
