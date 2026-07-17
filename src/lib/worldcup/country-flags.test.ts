import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { worldCupCountryFlag, worldCupTeamFlag } from "@/lib/worldcup/country-flags";

describe("worldCupCountryFlag", () => {
  it("resolves alpha-3 FIFA codes", () => {
    assert.equal(worldCupCountryFlag("Slovenia", "SVN"), "🇸🇮");
    assert.equal(worldCupCountryFlag("Germany", "GER"), "🇩🇪");
  });

  it("resolves country names", () => {
    assert.equal(worldCupCountryFlag("Colombia"), "🇨🇴");
    assert.equal(worldCupCountryFlag("Jordan"), "🇯🇴");
  });

  it("resolves team codes", () => {
    assert.equal(worldCupTeamFlag("ARG"), "🇦🇷");
    assert.equal(worldCupTeamFlag("ESP"), "🇪🇸");
  });
});
