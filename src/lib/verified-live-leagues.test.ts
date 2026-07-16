import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NCAA_LIVE_LEAGUE_IDS } from "@/lib/ncaa-live-leagues.generated";
import {
  COLLEGE_LIVE_LEAGUE_IDS,
  isCollegeLiveLeague,
  isNcaaConferenceGatedLive,
  isVerifiedLiveLeague,
  LAUNCHED_NCAA_LEAGUE_IDS,
  PRO_ONLY_LIVE_LEAGUE_IDS,
  VERIFIED_LIVE_LEAGUE_IDS,
} from "@/lib/verified-live-leagues";

describe("verified live leagues", () => {
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
