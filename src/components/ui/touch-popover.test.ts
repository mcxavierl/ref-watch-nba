import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildProvenanceTooltipLines } from "@/lib/provenance-tooltip";
import type { MetricProvenance } from "@/lib/types";

test("TouchPopover exposes accessible trigger and dismiss handlers", () => {
  const source = readFileSync("src/components/ui/TouchPopover.tsx", "utf8");
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /aria-controls=\{panelId\}/);
  assert.match(source, /PortaledHintPanel/);
  assert.match(source, /addEventListener\("pointerdown"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /onClick=\{\(\) => setOpen/);
});

test("TermHelp renders glossary hints through a portaled panel", () => {
  const source = readFileSync("src/components/TermHelp.tsx", "utf8");
  assert.match(source, /PortaledHintPanel/);
  assert.match(source, /term-help-mobile/);
});

test("ProvenanceIndicator uses TouchPopover instead of native title tooltips", () => {
  const source = readFileSync("src/components/hub/ProvenanceIndicator.tsx", "utf8");
  assert.match(source, /TouchPopover/);
  assert.match(source, /buildProvenanceTooltipLines/);
  assert.doesNotMatch(source, /title=/);
  assert.doesNotMatch(source, /provenance-indicator-tooltip/);
});

test("InsightMetricComparison uses MetricInfoHint for adjusted deltas", () => {
  const source = readFileSync("src/components/shared/InsightMetricComparison.tsx", "utf8");
  assert.match(source, /MetricInfoHint/);
  assert.doesNotMatch(source, /title=/);
});

test("buildProvenanceTooltipLines includes gate, tag, note, and updated date", () => {
  const provenance: MetricProvenance = {
    tag: "computed-with-partial-data",
    note: "Some O/U buckets below per-bucket sample gate.",
  };

  const lines = buildProvenanceTooltipLines({
    gate: {
      sampleSize: 12,
      gateThreshold: 30,
      cleared: false,
      label: "12/30 games, below threshold",
    },
    provenance,
    lastUpdated: "2026-07-10T16:38:04.484Z",
  });

  assert.deepEqual(lines, [
    "12/30 games, below threshold",
    "Verified: Partial data",
    "Some O/U buckets below per-bucket sample gate.",
    "Updated Jul 10, 2026",
  ]);
});

test("buildProvenanceTooltipLines prefers explicit source over tag label", () => {
  const lines = buildProvenanceTooltipLines({
    sampleSize: 42,
    source: "NBA game logs",
    provenance: { tag: "computed-from-real" },
  });

  assert.deepEqual(lines, ["42 games", "Verified: NBA game logs"]);
});
