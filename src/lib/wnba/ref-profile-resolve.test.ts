import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCrewMetrics, resolveWnbaRefProfile } from "@/lib/wnba/data";
import refStats from "@/../data/wnba/ref-stats.json";
import type { RefStatsFile } from "@/lib/types";

const stats = refStats as RefStatsFile;

describe("resolveWnbaRefProfile", () => {
  it("resolves Toni Patillo when assignment number is 0", () => {
    const profile = resolveWnbaRefProfile("Toni Patillo", 0, stats);
    assert.equal(profile?.slug, "toni-patillo-76");
    assert.ok((profile?.games ?? 0) > 0);
  });

  it("resolves refs by name when ESPN omits jersey numbers", () => {
    const crew = [
      { name: "Tiara Cruse", number: 0, role: "crew_chief" as const },
      { name: "Randy Richardson", number: 0, role: "referee" as const },
      { name: "Toni Patillo", number: 0, role: "umpire" as const },
    ];

    const metrics = computeCrewMetrics(crew, stats);
    assert.equal(metrics.insufficientSample, false);
    assert.ok(metrics.avgFouls > 0);
    assert.ok(metrics.sampleGames > 0);
  });
});
