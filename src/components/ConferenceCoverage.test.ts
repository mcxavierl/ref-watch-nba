import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("ConferenceCoverage maps every live conference to a display label", () => {
  const coverageSource = readFileSync("src/lib/ncaa-conference-coverage.ts", "utf8");
  assert.match(coverageSource, /Atlantic Coast Conference/);
  assert.match(coverageSource, /Southeastern Conference/);
  assert.match(coverageSource, /Big Ten Conference/);
  const componentSource = readFileSync("src/components/ConferenceCoverage.tsx", "utf8");
  assert.doesNotMatch(componentSource, /console\.(log|debug|info)/);
});

test("ConferenceCoverage DOM markup avoids internal league slugs in ids", () => {
  const source = readFileSync("src/components/ConferenceCoverage.tsx", "utf8");
  assert.doesNotMatch(source, /ncaa-coverage-heading-\$\{/);
  assert.doesNotMatch(source, /data-league/);
});

test("ConferenceCoverage uses maturity-based StatusBadge verdicts for default variant", () => {
  const source = readFileSync("src/components/ConferenceCoverage.tsx", "utf8");
  assert.match(source, /StatusBadge/);
  assert.match(source, /getConferenceCoverageRows/);
  assert.match(source, /row\.verdict/);
  assert.match(source, /row\.maturity/);
  assert.match(source, /NcaaConferenceLogo/);
  assert.match(source, /ncaa-coverage-live-link/);
  assert.match(source, /conferenceHubHref/);
});
