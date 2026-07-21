import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NCAA_LIVE_LEAGUE_IDS } from "@/lib/ncaa-live-leagues.generated";
import {
  activeLiveLeagueIds,
  COLLEGE_LIVE_LEAGUE_IDS,
  isCollegeLiveLeague,
  isNcaaConferenceGatedLive,
  isProAssignmentsLiveLeague,
  isProVerifiedLiveLeague,
  isVerifiedLiveLeague,
  LAUNCHED_NCAA_LEAGUE_IDS,
  OVERVIEW_HUB_LEAGUE_IDS,
  PRO_ASSIGNMENTS_LIVE_LEAGUE_IDS,
  PRO_MATRIX_ANALYTICS_LEAGUE_IDS,
  PRO_ONLY_LIVE_LEAGUE_IDS,
  PRO_VERIFIED_LIVE_LEAGUE_IDS,
  VERIFIED_LIVE_LEAGUE_IDS,
} from "@/lib/verified-live-leagues";

function assertNoDuplicateLeagueIds(
  label: string,
  leagueIds: readonly string[],
): void {
  const seen = new Set<string>();
  for (const leagueId of leagueIds) {
    assert.equal(
      seen.has(leagueId),
      false,
      `${label} lists ${leagueId} more than once`,
    );
    seen.add(leagueId);
  }
}

describe("verified live leagues", () => {
  it("never lists the same league id twice in catalog arrays", () => {
    assertNoDuplicateLeagueIds(
      "PRO_MATRIX_ANALYTICS_LEAGUE_IDS",
      PRO_MATRIX_ANALYTICS_LEAGUE_IDS,
    );
    assertNoDuplicateLeagueIds(
      "PRO_VERIFIED_LIVE_LEAGUE_IDS",
      PRO_VERIFIED_LIVE_LEAGUE_IDS,
    );
    assertNoDuplicateLeagueIds(
      "VERIFIED_LIVE_LEAGUE_IDS",
      VERIFIED_LIVE_LEAGUE_IDS,
    );
    assertNoDuplicateLeagueIds("activeLiveLeagueIds()", activeLiveLeagueIds());
  });

  it("launches CBB on the overview with CFB still gated", () => {
    assert.deepEqual([...LAUNCHED_NCAA_LEAGUE_IDS], ["cbb"]);
    assert.deepEqual([...COLLEGE_LIVE_LEAGUE_IDS], ["cbb"]);
    assert.equal(isCollegeLiveLeague("cbb"), true);
    assert.equal(isCollegeLiveLeague("cfb"), false);
  });

  it("includes launched NCAA hubs in verified live catalog", () => {
    assert.ok((VERIFIED_LIVE_LEAGUE_IDS as readonly string[]).includes("cbb"));
    assert.ok(!(VERIFIED_LIVE_LEAGUE_IDS as readonly string[]).includes("cfb"));
    assert.equal(isVerifiedLiveLeague("cbb"), true);
    assert.equal(isVerifiedLiveLeague("cfb"), false);
  });

  it("orders overview hub leagues with WNBA before CBB", () => {
    assert.deepEqual([...OVERVIEW_HUB_LEAGUE_IDS], [
      "nba",
      "nhl",
      "nfl",
      "epl",
      "laliga",
      "wnba",
      "cbb",
    ]);
  });

  it("includes WNBA as a verified pro league", () => {
    assert.deepEqual([...PRO_ASSIGNMENTS_LIVE_LEAGUE_IDS], []);
    assert.equal(isProAssignmentsLiveLeague("wnba"), false);
    assert.equal(isProVerifiedLiveLeague("wnba"), true);
    assert.equal(isVerifiedLiveLeague("wnba"), true);
    assert.ok((VERIFIED_LIVE_LEAGUE_IDS as readonly string[]).includes("wnba"));
  });

  it("keeps pro-only leagues separate from college launch list", () => {
    for (const leagueId of PRO_ONLY_LIVE_LEAGUE_IDS) {
      assert.equal(isCollegeLiveLeague(leagueId), false);
    }
  });

  it("build artifact marks CBB as conference-gated live", () => {
    assert.deepEqual([...NCAA_LIVE_LEAGUE_IDS], ["cbb"]);
    assert.equal(isNcaaConferenceGatedLive("cbb"), true);
    assert.equal(isNcaaConferenceGatedLive("cfb"), false);
  });
});
