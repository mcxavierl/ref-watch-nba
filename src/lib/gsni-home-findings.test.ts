import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGsniHomeFindings,
  formatGsniHomeDelta,
  GSNI_HOME_MIN_SAMPLE_GAMES,
} from "./gsni-home-findings";
import type { RefStatsFile } from "@/lib/types";

function ref(
  slug: string,
  name: string,
  gsni: number,
  sampleGames: number,
  hlMinutes: number,
): RefStatsFile["refs"][number] {
  return {
    slug,
    name,
    number: 0,
    games: sampleGames,
    avgTotalPoints: 45,
    overRate: 0.5,
    avgFouls: 12,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2023-24"],
    recentGames: [],
    referee_gsni: gsni,
    gsniSampleGames: sampleGames,
    gsniHighLeverageMinutes: hlMinutes,
  };
}

const stats: RefStatsFile = {
  meta: {
    lastUpdated: "2026-01-01T00:00:00.000Z",
    seasons: ["2023-24"],
    leagueAvgTotal: 45,
    leagueAvgFouls: 12,
    leagueOverBaseline: 46,
    minSampleSize: 30,
    source: "hybrid",
    atsAvailable: false,
    refCount: 4,
    totalGamesProcessed: 1000,
  },
  refs: [
    ref("quiet-large", "Barry Anderson", 100, 350, 40),
    ref("heavy-large", "Tony Corrente", 0, 320, 42),
    ref("quiet-small", "Quiet Small", 100, 120, 30),
    ref("neutral-large", "Neutral Large", 55, 400, 50),
  ],
  teamSplits: {},
};

describe("buildGsniHomeFindings", () => {
  it("returns extreme clutch profiles with large samples only", () => {
    const findings = buildGsniHomeFindings(stats);
    assert.equal(findings.length, 2);
    assert.ok(findings.every((row) => row.sampleGames >= GSNI_HOME_MIN_SAMPLE_GAMES));
    assert.ok(findings.some((row) => row.consistencyProfile === "high-consistency"));
    assert.ok(findings.some((row) => row.consistencyProfile === "high-variance"));
  });

  it("prefers the largest eligible samples", () => {
    const findings = buildGsniHomeFindings(stats);
    assert.equal(findings[0]?.refSlug, "quiet-large");
    assert.equal(findings[1]?.refSlug, "heavy-large");
  });

  it("uses descriptive clutch consistency copy and sample transparency", () => {
    const finding = buildGsniHomeFindings(stats)[0];
    assert.equal(
      finding?.headline,
      "Barry Anderson shows high consistency in clutch situations.",
    );
    assert.match(finding?.minutesLine ?? "", /Based on N=40 high-leverage minutes/);
    assert.equal(finding?.confidenceTag, "Preliminary");
    assert.equal(finding?.stats.length, 2);
    assert.equal(finding?.stats[1]?.label, "High-leverage minutes");
  });
});

describe("formatGsniHomeDelta", () => {
  it("formats delta from neutral", () => {
    assert.equal(formatGsniHomeDelta(50), "+50 vs 50 avg");
    assert.equal(formatGsniHomeDelta(-50), "-50 vs 50 avg");
  });
});
