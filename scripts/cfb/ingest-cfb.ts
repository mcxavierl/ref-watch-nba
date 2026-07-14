#!/usr/bin/env npx tsx
/**
 * Fast CFB ESPN extract wrapper for single-conference debugging.
 *
 * Examples:
 *   npm run ingest-cfb -- --league=big-12
 *   npm run ingest-cfb -- --league=sec
 */
import { parseCfbBuildArgs, runCfbIngest } from "./build-ref-data";

async function main(): Promise<void> {
  const options = parseCfbBuildArgs(process.argv.slice(2));
  if (!options.leagueSlug) {
    console.error(
      "ingest-cfb requires --league=<slug> (e.g. --league=big-12). " +
        "Conferences are defined in config/leagues.json.",
    );
    process.exit(1);
  }

  console.log(`=== CFB conference ingest (${options.leagueSlug}) ===\n`);
  await runCfbIngest(options);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
