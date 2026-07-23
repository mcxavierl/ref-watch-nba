import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOfficiatingFingerprint,
  formatOfficiatingFingerprintTooltipAria,
} from "@/lib/analytics/officiating-fingerprint";
import { loadLeagueStats } from "@/lib/load-league-stats";
import type { RefProfile } from "@/lib/types";

const FIXTURE_SLUG = "scott-foster-48";

function cloneProfile(profile: RefProfile, overrides: Partial<RefProfile> = {}): RefProfile {
  return {
    ...profile,
    recentGames: [...(profile.recentGames ?? [])],
    ...overrides,
  };
}

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
      assert.equal(axis.tooltip.label, axis.label);
      assert.ok(axis.tooltip.description.length > 0);
      assert.ok(axis.tooltip.subtext.length > 0);
      assert.ok(
        formatOfficiatingFingerprintTooltipAria(axis.tooltip).includes(
          axis.tooltip.label,
        ),
      );
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

  it("falls back to home foul bias when ATS cover is unavailable", () => {
    const { stats } = loadLeagueStats("nba");
    const profile =
      stats.refs.find((ref) => ref.slug === FIXTURE_SLUG) ?? stats.refs[0];
    if (!profile) return;

    const fingerprint = buildOfficiatingFingerprint(
      "nba",
      cloneProfile(profile, { homeCoverRate: null, bettingStats: undefined }),
      stats,
      true,
    );
    assert.ok(fingerprint);

    const homeAxis = fingerprint!.axes.find(
      (axis) => axis.id === "home_court_disparity",
    );
    assert.ok(homeAxis);
    assert.doesNotMatch(
      JSON.stringify(homeAxis!.tooltip),
      /unavailable for this sample/i,
    );
    assert.match(
      homeAxis!.tooltip.subtext,
      /home whistle bias vs baseline/i,
    );
  });

  it("uses structured whistle consistency tooltip copy", () => {
    const { stats } = loadLeagueStats("nba");
    const profile =
      stats.refs.find((ref) => ref.slug === FIXTURE_SLUG) ?? stats.refs[0];
    if (!profile) return;

    const fingerprint = buildOfficiatingFingerprint("nba", profile, stats, true);
    assert.ok(fingerprint);

    const consistencyAxis = fingerprint!.axes.find(
      (axis) => axis.id === "consistency_index",
    );
    assert.ok(consistencyAxis);
    assert.equal(consistencyAxis!.label, "Whistle Consistency");
    assert.match(
      consistencyAxis!.tooltip.description,
      /game-to-game call volume variance/i,
    );
    assert.match(consistencyAxis!.tooltip.subtext, /Game Variance: ±/);
  });

  it("uses contact sensitivity tooltip copy", () => {
    const { stats } = loadLeagueStats("nba");
    const profile =
      stats.refs.find((ref) => ref.slug === FIXTURE_SLUG) ?? stats.refs[0];
    if (!profile) return;

    const fingerprint = buildOfficiatingFingerprint("nba", profile, stats, true);
    assert.ok(fingerprint);

    const contactAxis = fingerprint!.axes.find(
      (axis) => axis.id === "contact_tolerance",
    );
    assert.ok(contactAxis);
    assert.equal(contactAxis!.label, "Contact Sensitivity");
    assert.match(
      contactAxis!.tooltip.description,
      /whistle frequency per possession/i,
    );
  });
});
