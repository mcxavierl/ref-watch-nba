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
});
