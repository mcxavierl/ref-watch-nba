import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  conferenceToPrimaryRegion,
  deriveExperienceLevel,
} from "../../src/lib/ncaa-personnel-enrichment";
import {
  buildProLeagueOfficialIndex,
  resolveProLeagueLinks,
} from "./lib/ncaa-entity-resolution";
import {
  buildNcaaPersonnelProfileFile,
  normalizeNcaaRosterRow,
} from "./lib/ncaa-normalize";
import {
  parseNcaaOfficialsCsv,
  validateNcaaRosterIntegrity,
} from "./lib/ncaa-roster-parser";

describe("parseNcaaOfficialsCsv", () => {
  it("parses required columns and normalizes status", () => {
    const csv = `official_id,name,number,conference,primary_region,historical_game_count,status
cbb-paul-szelc-142,Paul Szelc,142,ACC,Southeast,258,active
cfb-bill-vinovich-52,Bill Vinovich,52,Other,National,120,active`;

    const parsed = parseNcaaOfficialsCsv(csv, "CBB");
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0]?.officialId, "cbb-paul-szelc-142");
    assert.equal(parsed.rows[1]?.status, "active");
  });

  it("rejects rows with invalid game counts", () => {
    const csv = `official_id,name,number,conference,primary_region,historical_game_count,status
cbb-bad-1,Bad Row,1,Other,National,-5,active`;

    const parsed = parseNcaaOfficialsCsv(csv, "CBB");
    assert.ok(parsed.errors.some((error) => error.includes("historical_game_count")));
    assert.equal(parsed.rows.length, 0);
  });
});

describe("validateNcaaRosterIntegrity", () => {
  it("fails when active officials have null official_id", () => {
    const result = validateNcaaRosterIntegrity([
      {
        officialId: "",
        name: "Missing Id",
        number: 1,
        conference: "Other",
        primaryRegion: "National",
        historicalGameCount: 10,
        status: "active",
      },
    ]);
    assert.equal(result.valid, false);
    assert.ok(
      result.failures[0]?.reasons.some((reason) =>
        reason.includes("active officials require non-null official_id"),
      ),
    );
  });

  it("passes for well-formed active roster rows", () => {
    const result = validateNcaaRosterIntegrity([
      {
        officialId: "cbb-test-1",
        name: "Test Official",
        number: 1,
        conference: "ACC",
        primaryRegion: "Southeast",
        historicalGameCount: 45,
        status: "active",
      },
    ]);
    assert.equal(result.valid, true);
  });
});

describe("ncaa personnel enrichment", () => {
  it("maps conferences to primary regions", () => {
    assert.equal(conferenceToPrimaryRegion("ACC"), "Southeast");
    assert.equal(conferenceToPrimaryRegion("Big Ten"), "Midwest");
    assert.equal(conferenceToPrimaryRegion("Unknown"), "National");
  });

  it("derives experience tiers from historical game counts", () => {
    assert.equal(deriveExperienceLevel(250), "veteran");
    assert.equal(deriveExperienceLevel(150), "experienced");
    assert.equal(deriveExperienceLevel(50), "developing");
    assert.equal(deriveExperienceLevel(5), "rookie");
  });
});

describe("entity resolution", () => {
  it("links Bill Vinovich across NFL and NCAA CFB rosters", () => {
    const index = buildProLeagueOfficialIndex(process.cwd());
    const links = resolveProLeagueLinks("Bill Vinovich", index);
    assert.ok(links.some((link) => link.league === "nfl"));
  });
});

describe("normalizeNcaaRosterRow", () => {
  it("builds sidecar-ready profile metadata", () => {
    const index = buildProLeagueOfficialIndex(process.cwd());
    const profile = normalizeNcaaRosterRow(
      {
        officialId: "cfb-bill-vinovich-52",
        name: "Bill Vinovich",
        number: 52,
        conference: "Other",
        primaryRegion: "National",
        historicalGameCount: 220,
        status: "active",
      },
      "CFB",
      index,
    );

    assert.equal(profile.experienceLevel, "veteran");
    assert.equal(profile.slug, "bill-vinovich-52");
    const file = buildNcaaPersonnelProfileFile([profile]);
    assert.equal(file.league, "NCAA");
    assert.equal(file.officials[0]?.conference, "Other");
  });
});
