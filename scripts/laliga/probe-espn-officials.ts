#!/usr/bin/env npx tsx
/**
 * Probe ESPN La Liga gameInfo.officials coverage by season.
 */
import {
  fetchLaligaSummary,
  fetchSeasonEventIds,
  inferLaligaSeason,
  sleep,
} from "./lib/espn";

const SEASONS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const SAMPLE_SIZE = 15;

function sampleIds(ids: string[], n: number): string[] {
  if (ids.length <= n) return ids;
  const step = Math.max(1, Math.floor(ids.length / n));
  const out: string[] = [];
  for (let i = 0; i < ids.length && out.length < n; i += step) out.push(ids[i]);
  return out;
}

async function main() {
  console.log(
    "espnYear | seasonLabel | totalEvents | sampled | completed | withOfficials | pctOfficials",
  );
  console.log(
    "---------|-------------|-------------|---------|-----------|-----------------|-------------",
  );

  for (const year of SEASONS) {
    let eventIds: string[] = [];
    try {
      eventIds = await fetchSeasonEventIds(year);
    } catch {
      console.log(
        `${year} | ${inferLaligaSeason(year)} | ERROR | - | - | - | -`,
      );
      continue;
    }
    const sample = sampleIds(eventIds, SAMPLE_SIZE);
    let completed = 0;
    let withOfficials = 0;
    for (const id of sample) {
      await sleep(60);
      const summary = await fetchLaligaSummary(id, year);
      if (!summary) continue;
      completed++;
      if (summary.officials.length > 0) withOfficials++;
    }
    const pct =
      completed > 0
        ? `${((withOfficials / completed) * 100).toFixed(1)}%`
        : "n/a";
    console.log(
      `${year} | ${inferLaligaSeason(year)} | ${eventIds.length} | ${sample.length} | ${completed} | ${withOfficials} | ${pct}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
