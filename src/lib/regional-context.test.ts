import test from "node:test";
import assert from "node:assert/strict";
import { computeAllFindings as computeNflFindings } from "@/lib/nfl/findings";
import { computeAllFindings as computeNbaFindings } from "@/lib/findings";
import type { Finding } from "@/lib/findings-shared";
import {
  attachRegionalContextToFindings,
  birthplaceCorrelatesWithFinding,
  findingHasExtremeDelta,
  formatRegionalContextCopy,
  isHighConfidenceFinding,
  resolveRegionalContextForFinding,
} from "@/lib/regional-context";
import type { RefStatsFile } from "@/lib/types";

const matrixFinding: Finding = {
  id: "nfl-matrix-high",
  category: "ref-team-split",
  headline: "Dale Shaw and Los Angeles Rams: 51.5 pts above team baseline",
  summary: "Sample summary",
  stats: [
    { label: "Delta vs baseline", value: "+51.5 pts", detail: "Above" },
  ],
  sampleNote: "Sample: 8 games over 26 seasons (2000–2026)",
  links: [
    { label: "Dale Shaw", href: "/nfl/refs/dale-shaw-0" },
    { label: "Los Angeles Rams", href: "/nfl/teams/LAR" },
  ],
};

const uncorrelatedFinding: Finding = {
  ...matrixFinding,
  id: "nfl-matrix-low",
  headline: "Jerome Boger and Pittsburgh Steelers: 49.9 pts below team baseline",
  links: [
    { label: "Jerome Boger", href: "/nfl/refs/jerome-boger-23" },
    { label: "Pittsburgh Steelers", href: "/nfl/teams/PIT" },
  ],
  stats: [
    { label: "Delta vs baseline", value: "-49.9 pts", detail: "Below" },
  ],
};

const thinFinding: Finding = {
  ...matrixFinding,
  sampleNote: "Sample: 4 games",
  stats: [{ label: "Delta vs baseline", value: "+51.5 pts" }],
};

test("isHighConfidenceFinding maps Strong tier", () => {
  assert.equal(isHighConfidenceFinding(matrixFinding), true);
  assert.equal(isHighConfidenceFinding(thinFinding), false);
});

test("findingHasExtremeDelta respects matrix threshold", () => {
  assert.equal(findingHasExtremeDelta(matrixFinding), true);
  assert.equal(
    findingHasExtremeDelta({
      ...matrixFinding,
      stats: [{ label: "Delta vs baseline", value: "+12.0 pts" }],
    }),
    false,
  );
});

test("birthplaceCorrelatesWithFinding requires city overlap", () => {
  assert.ok(
    birthplaceCorrelatesWithFinding(
      "Los Angeles, California",
      matrixFinding,
      "NFL",
    ),
  );
  assert.equal(
    birthplaceCorrelatesWithFinding(
      "Atlanta, Georgia",
      uncorrelatedFinding,
      "NFL",
    ),
    null,
  );
});

test("formatRegionalContextCopy stays objective", () => {
  const copy = formatRegionalContextCopy(
    "Los Angeles, California",
    "West Division matchups",
  );
  assert.match(copy, /Official is a native of Los Angeles, California/);
  assert.match(copy, /West Division matchups/);
  assert.doesNotMatch(copy, /bias|conspiracy/i);
});

test("resolveRegionalContextForFinding gates on confidence, delta, and correlation", () => {
  const stats = { refs: [], meta: {}, teamSplits: {} } as unknown as RefStatsFile;
  assert.equal(
    resolveRegionalContextForFinding(uncorrelatedFinding, stats),
    undefined,
  );
});

test("attachRegionalContextToFindings enriches correlated NFL matrix finding", () => {
  const nfl = computeNflFindings();
  const high = nfl.find((finding) => finding.id === "nfl-matrix-high");
  assert.ok(high?.regionalContext);
  assert.match(high.regionalContext, /Los Angeles, California/);

  const low = nfl.find((finding) => finding.id === "nfl-matrix-low");
  assert.equal(low?.regionalContext, undefined);
});

test("attachRegionalContextToFindings enriches correlated NBA matrix finding", () => {
  const nba = computeNbaFindings();
  const high = nba.find((finding) => finding.id === "matrix-high");
  assert.ok(high?.regionalContext);
  assert.match(high.regionalContext, /Sacramento, California/);
});

test("attachRegionalContextToFindings leaves unrelated findings unchanged", () => {
  const stats = { refs: [], meta: {}, teamSplits: {} } as unknown as RefStatsFile;
  const enriched = attachRegionalContextToFindings([thinFinding], stats);
  assert.equal(enriched[0]?.regionalContext, undefined);
});
