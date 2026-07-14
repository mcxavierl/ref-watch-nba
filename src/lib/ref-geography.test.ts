import assert from "node:assert/strict";
import test from "node:test";
import {
  enrichRefStatsWithGeography,
  mergeRefGeographyIntoStats,
  resolveRefBirthplace,
} from "@/lib/ref-geography";
import type { RefStatsFile } from "@/lib/types";

const EMPTY_STATS = {
  meta: {
    lastUpdated: "2026-01-01",
    seasons: [],
    leagueAvgTotal: 0,
    leagueAvgFouls: 0,
    leagueOverBaseline: 0,
    minSampleSize: 30,
    source: "seeded" as const,
    atsAvailable: false,
  },
  refs: [
    { slug: "scott-foster-48", name: "Scott Foster", number: 48, games: 10 },
    { slug: "unknown-ref-99", name: "Unknown Ref", number: 99, games: 1 },
  ],
  teamSplits: {},
} as unknown as RefStatsFile;

test("mergeRefGeographyIntoStats stamps profile fields from shard", () => {
  const merged = mergeRefGeographyIntoStats(EMPTY_STATS, "NBA");
  const foster = merged.refs.find((ref) => ref.slug === "scott-foster-48");
  assert.equal(foster?.hometown, "Boston, MA");
  assert.equal(merged.refGeography?.["scott-foster-48"]?.hometown, "Boston, MA");
});

test("mergeRefGeographyIntoStats leaves refs without geography unchanged", () => {
  const merged = mergeRefGeographyIntoStats(EMPTY_STATS, "NBA");
  const unknown = merged.refs.find((ref) => ref.slug === "unknown-ref-99");
  assert.equal(unknown?.birthplace, undefined);
  assert.equal(unknown?.hometown, undefined);
});

test("enrichRefStatsWithGeography covers all five live leagues", () => {
  for (const leagueId of ["nba", "nfl", "nhl", "epl", "laliga"] as const) {
    const enriched = enrichRefStatsWithGeography(leagueId, EMPTY_STATS);
    assert.ok(enriched.refs.length === EMPTY_STATS.refs.length);
  }
});

test("resolveRefBirthplace prefers profile over shard index", () => {
  const stats = {
    ...EMPTY_STATS,
    refs: [
      {
        ...EMPTY_STATS.refs[0],
        birthplace: "Denver, CO",
      },
    ],
  } as RefStatsFile;
  assert.equal(resolveRefBirthplace("scott-foster-48", stats, "NBA"), "Denver, CO");
});

test("mergeRefGeographyIntoStats does not mutate input", () => {
  const before = structuredClone(EMPTY_STATS);
  mergeRefGeographyIntoStats(EMPTY_STATS, "NFL");
  assert.deepEqual(EMPTY_STATS.refs[0], before.refs[0]);
});
