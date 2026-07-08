#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import {
  applyBbrRefTeamStats,
  kogutTorAggregate,
  loadRefStatsBase,
} from "./lib/apply-bbr-ref-team-stats";
import {
  loadBbrRefTeamRecords,
  saveBbrRefTeamRecords,
  scrapeBbrRefTeamRecords,
} from "./lib/bbr-ref-team-records";

async function main() {
  const skipScrape = process.argv.includes("--skip-scrape");
  const dataDir = path.join(process.cwd(), "data");
  const fixturePath = path.join(dataDir, "bbr-ref-team-records.json");

  console.log("=== BBR ref×team W-L build ===\n");

  let fixture = loadBbrRefTeamRecords(fixturePath);
  if (!skipScrape) {
    console.log("Scraping Basketball-Reference (30 teams × 5 seasons)...");
    fixture = await scrapeBbrRefTeamRecords({
      existing: fixture ?? undefined,
      outputPath: fixturePath,
    });
    saveBbrRefTeamRecords(fixture, fixturePath);
  } else if (!fixture || fixture.entries.length === 0) {
    console.error("No BBR fixture found. Run without --skip-scrape or populate data/bbr-ref-team-records.json");
    process.exit(1);
  } else {
    console.log(`Using existing fixture (${fixture.entries.length} team-seasons)`);
    if (fixture.entries.length < 150) {
      console.warn(`Fixture incomplete: ${fixture.entries.length}/150 team-seasons`);
    }
  }

  const before = loadRefStatsBase();
  const kogutBefore = before.refs.find((r) => r.slug === "marat-kogut-32")
    ?.teamStats?.TOR;

  const { stats, matchedPairs, unmatchedReferees } = applyBbrRefTeamStats(
    before,
    fixture,
  );

  const kogutAfter = stats.refs.find((r) => r.slug === "marat-kogut-32")
    ?.teamStats?.TOR;
  const kogutBbr = kogutTorAggregate(fixture, fixture.seasons);

  fs.writeFileSync(
    path.join(dataDir, "ref-stats.json"),
    JSON.stringify(stats, null, 2),
  );
  fs.writeFileSync(
    path.join(dataDir, "ref-stats.seed.json"),
    JSON.stringify(stats, null, 2),
  );
  console.log(`Wrote ${dataDir}/ref-stats.json and ref-stats.seed.json`);

  console.log("\n--- Summary ---");
  console.log(
    `Scrape: ${fixture.stats.pagesFetched} pages fetched, ${fixture.stats.pagesFailed} failed, ${fixture.stats.refTeamPairs} ref×team pairs`,
  );
  console.log(`Apply: ${matchedPairs} ref×team pairs matched to roster`);
  if (unmatchedReferees.length > 0) {
    console.log(
      `Unmatched BBR referees (${unmatchedReferees.length}): ${unmatchedReferees.join(", ")}`,
    );
  }

  if (kogutBefore && kogutAfter && kogutBbr) {
    const beforeWins = Math.round(kogutBefore.winRate * kogutBefore.games);
    console.log(
      `Kogut×TOR before: ${beforeWins}-${kogutBefore.games - beforeWins} (${kogutBefore.games} gp, ${(kogutBefore.winRate * 100).toFixed(1)}%)`,
    );
    console.log(
      `Kogut×TOR after:  ${kogutAfter.wins}-${kogutAfter.losses} (${kogutAfter.games} gp, ${(kogutAfter.winRate * 100).toFixed(1)}%)`,
    );
    console.log(
      `Kogut×TOR BBR:    ${kogutBbr.wins}-${kogutBbr.losses} (${kogutBbr.games} gp)`,
    );
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
