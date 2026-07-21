import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOfficiatingFingerprint } from "@/lib/analytics/officiating-fingerprint";
import { loadLeagueStats } from "@/lib/load-league-stats";

const FIXTURE_SLUG = "scott-foster-48";

describe("officiating-fingerprint", () => {
  it("builds eight normalized axes for a qualified NBA official", () => {
    const { stats } = loadLeagueStats("nba");
    const profile =
      stats.refs.find((ref) => ref.slug === FIXTURE_SLUG) ?? stats.refs[0];
    if (!profile) return;

    const fingerprint = buildOfficiatingFingerprint(
      "nba",
      profile,
      stats,
      profile.games >= stats.meta.minSampleSize,
    );

    if (!fingerprint) return;
    assert.equal(fingerprint.axes.length, 8);
    for (const axis of fingerprint.axes) {
      assert.ok(axis.percentile >= 0 && axis.percentile <= 100);
      assert.ok(axis.tooltip.includes(axis.label));
    }
  });

  it("includes league-average reference at the 50th percentile", () => {
    const { stats } = loadLeagueStats("nba");
    const profile =
      stats.refs.find((ref) => ref.slug === FIXTURE_SLUG) ?? stats.refs[0];
    if (!profile) return;

    const fingerprint = buildOfficiatingFingerprint("nba", profile, stats, true);
    if (!fingerprint) return;

    assert.ok(
      fingerprint.axes.every((axis) => axis.leagueAveragePercentile === 50),
    );
  });
});
