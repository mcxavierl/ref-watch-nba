import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("refactor safety static checks", () => {
  it("league-analytics-hydrate imports isFrictionMatrixLeague from friction-matrix", () => {
    const source = readSrc("src/lib/league-analytics-hydrate.ts");
    assert.match(
      source,
      /import\s*\{[^}]*isFrictionMatrixLeague[^}]*\}\s*from\s*["']@\/lib\/friction-matrix["']/,
      "isFrictionMatrixLeague must be imported from @/lib/friction-matrix",
    );
    assert.doesNotMatch(
      source,
      /import\s*\{[^}]*isFrictionMatrixLeague[^}]*\}\s*from\s*["']@\/lib\/personnel-profiles["']/,
      "isFrictionMatrixLeague must not be imported from personnel-profiles",
    );
  });

  it("RefTeamMatrix imports matrixCellMetricGames from ref-team-matrix", () => {
    const source = readSrc("src/components/RefTeamMatrix.tsx");
    assert.match(
      source,
      /matrixCellMetricGames/,
      "RefTeamMatrix must use matrixCellMetricGames",
    );
    assert.match(
      source,
      /import\s*\{[\s\S]*matrixCellMetricGames[\s\S]*\}\s*from\s*["']@\/lib\/ref-team-matrix["']/,
      "matrixCellMetricGames must be imported from @/lib/ref-team-matrix",
    );
  });

  it("matrix-ats-enrich imports DataLeague from game-logs-preload", () => {
    const source = readSrc("src/lib/matrix-ats-enrich.ts");
    assert.match(
      source,
      /import\s*\{[^}]*DataLeague[^}]*\}\s*from\s*["']@\/lib\/game-logs-preload["']/,
      "DataLeague must be imported from @/lib/game-logs-preload",
    );
  });

  it("SiteFooter imports FooterLeague from footer-league", () => {
    const source = readSrc("src/components/SiteFooter.tsx");
    assert.match(
      source,
      /import\s*\{[\s\S]*FooterLeague[\s\S]*\}\s*from\s*["']@\/lib\/footer-league["']/,
      "FooterLeague must be imported from @/lib/footer-league",
    );
  });

  it("refs-directory stays client-safe (no server data loaders)", () => {
    const source = readSrc("src/lib/refs-directory.ts");
    assert.doesNotMatch(
      source,
      /from\s*["']@\/lib\/insights\/international-matchups["']/,
      "refs-directory must not import international-matchups (pulls loadLeagueStats)",
    );
    assert.doesNotMatch(
      source,
      /from\s*["']@\/lib\/load-league-stats["']/,
      "refs-directory must not import load-league-stats",
    );
    assert.match(
      source,
      /from\s*["']@\/lib\/insights\/team-nation["']/,
      "refs-directory must import teamNationForLeague from team-nation",
    );
  });

  it("insight-drilldown-builder tests must not pin specific generated insight cards", () => {
    const source = readSrc("scripts/lib/insight-drilldown-builder.test.ts");
    assert.doesNotMatch(
      source,
      /\.find\([^)]*refSlug\s*===\s*["'][a-z0-9-]+["']/,
      "select matrix cards by league/kind — overview-insights.json changes when standout splits rebuild",
    );
  });
});
