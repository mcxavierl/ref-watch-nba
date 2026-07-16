import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("ConferenceCoverage maps every live conference to a display label", () => {
  const source = readFileSync("src/components/ConferenceCoverage.tsx", "utf8");
  assert.match(source, /Atlantic Coast Conference/);
  assert.match(source, /Southeastern Conference/);
  assert.match(source, /Big Ten Conference/);
  assert.doesNotMatch(source, /console\.(log|debug|info)/);
});

test("ConferenceCoverage DOM markup avoids internal league slugs in ids", () => {
  const source = readFileSync("src/components/ConferenceCoverage.tsx", "utf8");
  assert.doesNotMatch(source, /ncaa-coverage-heading-\$\{/);
  assert.doesNotMatch(source, /data-league/);
});

test("ConferenceCoverage uses Clinical Modern StatusBadge for live rows", () => {
  const source = readFileSync("src/components/ConferenceCoverage.tsx", "utf8");
  assert.match(source, /StatusBadge/);
  assert.match(source, /verdict="pass"/);
});
