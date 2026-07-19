import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Pill component enforces overflow containment utilities", () => {
  const source = readFileSync("src/components/ui/Pill.tsx", "utf8");
  assert.match(source, /pill-constrain/);
  assert.match(source, /pill-constrain-text/);
  assert.match(source, /variant\?: PillVariant/);
  const css = readFileSync("src/styles/pill-constraints.css", "utf8");
  assert.match(css, /white-space: nowrap/);
  assert.match(css, /text-overflow: ellipsis/);
});

test("pill-constraints.css defines shared tokens and card flex guards", () => {
  const source = readFileSync("src/styles/pill-constraints.css", "utf8");
  assert.match(source, /--pill-padding-y/);
  assert.match(source, /--pill-font-size/);
  assert.match(source, /\.pill-constrain/);
  assert.match(source, /min-width: 0/);
  assert.match(source, /ref-card-head/);
  assert.match(source, /data-pill-debug/);
});

test("globals.css imports pill-constraints stylesheet", () => {
  const source = readFileSync("src/app/globals.css", "utf8");
  assert.match(source, /pill-constraints\.css/);
});

test("DynamicInsightPill delegates to shared Pill wrapper", () => {
  const source = readFileSync("src/components/DynamicInsightPill.tsx", "utf8");
  assert.match(source, /from "@\/components\/ui\/Pill"/);
  assert.match(source, /<Pill/);
  assert.doesNotMatch(source, /ref-master-insight-pill ref-master-insight-pill--static/);
});

test("HighlightStatCard hero category uses Pill variant", () => {
  const source = readFileSync("src/components/HighlightStatCard.tsx", "utf8");
  assert.match(source, /<Pill variant="category"/);
});

test("RankingSignalPill uses pill-constrain for overflow", () => {
  const source = readFileSync("src/components/RankingSignalPill.tsx", "utf8");
  assert.match(source, /pill-constrain/);
  assert.match(source, /pill-constrain-text/);
});

test("StatusBadge and InsightBadge truncate label text", () => {
  const status = readFileSync("src/components/hub/StatusBadge.tsx", "utf8");
  const insight = readFileSync("src/components/hub/InsightBadge.tsx", "utf8");
  assert.match(status, /pill-constrain-text/);
  assert.match(insight, /pill-constrain-text/);
});
