import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  auditHighlightIntegrityForLiveLeagues,
  auditRankingsHighlightGrid,
} from "@/lib/highlight-integrity-audit";
import { createHighlightBadgeRegistry } from "@/lib/highlight-badge";
import { buildRankingsSynthesis } from "@/lib/rankings-synthesis";
import { LEAGUES } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

const ROOT = join(import.meta.dirname, "..");

function makeRef(
  slug: string,
  overrides: Partial<RefProfile> = {},
): RefProfile {
  return {
    slug,
    name: slug,
    number: 1,
    games: 40,
    role: "referee",
    avgTotalPoints: 6,
    overRate: 0.4,
    avgFouls: 10,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024-25"],
    recentGames: [],
    ...overrides,
  };
}

function makeStats(refs: RefProfile[]): RefStatsFile {
  return {
    meta: {
      lastUpdated: "2026-07-13",
      seasons: ["2024-25"],
      leagueAvgTotal: 6,
      leagueAvgFouls: 10,
      leagueOverBaseline: 6.3,
      minSampleSize: 30,
      source: "seeded",
      atsAvailable: false,
    },
    refs,
    teamSplits: {},
  };
}

describe("audit-highlight-integrity", () => {
  it("passes on the current live league grids", () => {
    const results = auditHighlightIntegrityForLiveLeagues();
    const failures = results.flatMap((result) => result.failures);
    assert.deepEqual(failures, []);
  });

  it("flags duplicate primary superlatives in a synthetic grid", () => {
    const registry = createHighlightBadgeRegistry();
    const first = registry.scoringBadge(-1.2);
    const second = registry.scoringBadge(-1.1);
    assert.equal(first?.tier, "primary");
    assert.equal(second?.tier, "secondary");

    const stats = makeStats([
      makeRef("dip-a", { name: "Dip A", totalPointsDelta: -1.2 }),
      makeRef("dip-b", { name: "Dip B", totalPointsDelta: -1.1 }),
      makeRef("over-a", { name: "Over A", overRate: 0.62 }),
    ]);
    const synthesis = buildRankingsSynthesis(stats, LEAGUES.nhl, { maxCards: 2 });
    const failures = auditRankingsHighlightGrid(synthesis, stats, LEAGUES.nhl);
    assert.equal(
      failures.filter((failure) => failure.includes("duplicate primary")).length,
      0,
    );
  });

  it("package.json exposes audit:highlight-integrity script", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
    assert.match(pkg, /audit:highlight-integrity/);
    assert.match(pkg, /check:ci[\s\S]*audit:highlight-integrity/);
  });

  it("audit script exits cleanly on the current tree", () => {
    const output = execSync("npx tsx scripts/audit-highlight-integrity.ts", {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.match(output, /Highlight integrity audit passed/);
  });
});
