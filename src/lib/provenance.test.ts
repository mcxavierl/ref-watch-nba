import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { refProfileCoreProvenance, refStatsDataTag } from "@/lib/provenance";
import { buildProvenanceTooltipLines } from "@/lib/provenance-tooltip";
import type { RefProfile, RefStatsFile } from "@/lib/types";

const hybridMeta: RefStatsFile["meta"] = {
  lastUpdated: "2026-07-10T16:38:04.484Z",
  seasons: ["2025-26"],
  leagueAvgTotal: 223.2,
  leagueAvgFouls: 39.5,
  leagueOverBaseline: 223.2,
  minSampleSize: 30,
  source: "hybrid",
  data_verified: true,
  atsAvailable: false,
};

const sampleProfile: RefProfile = {
  slug: "jacyn-goble-68",
  name: "Jacyn Goble",
  number: 68,
  games: 1096,
  avgTotalPoints: 224.1,
  overRate: 0.471,
  avgFouls: 40,
  homeCoverRate: null,
  totalPointsDelta: 0.9,
  foulsDelta: 0.5,
  seasons: ["2025-26"],
  recentGames: [],
};

describe("refStatsDataTag", () => {
  it("treats verified hybrid NBA ingest as real data", () => {
    assert.equal(refStatsDataTag(hybridMeta), "computed-from-real");
  });

  it("exposes core metrics on verified hybrid profiles", () => {
    const provenance = refProfileCoreProvenance(sampleProfile, hybridMeta);
    assert.ok(provenance);
    assert.equal(provenance.avgTotalPoints?.tag, "computed-from-real");
    assert.equal(provenance.overRate?.tag, "computed-from-real");
    assert.equal(provenance.avgFouls?.tag, "computed-from-real");
  });

  it("builds tooltip lines from profile core provenance", () => {
    const provenance = refProfileCoreProvenance(sampleProfile, hybridMeta);
    assert.ok(provenance);
    const lines = buildProvenanceTooltipLines({
      provenance: provenance!.avgTotalPoints,
      gate: provenance!.sampleGate,
    });

    assert.ok(lines.some((line) => line.includes("games")));
    assert.ok(lines.some((line) => line.includes("From real games")));
  });
});
