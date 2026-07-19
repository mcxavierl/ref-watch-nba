import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  formatSuperBowlVariancePill,
  superBowlFindingCardModel,
} from "@/lib/nfl/super-bowl-insight-card";
import { computeSuperBowlFindings } from "@/lib/nfl/super-bowl-officiating";

test("Super Bowl section uses insight card grid instead of wide finding pills", () => {
  const section = readFileSync("src/components/SuperBowlOfficiatingSection.tsx", "utf8");
  const card = readFileSync("src/components/SuperBowlInsightCard.tsx", "utf8");
  assert.match(section, /super-bowl-insight-grid/);
  assert.match(section, /SuperBowlInsightCard/);
  assert.doesNotMatch(section, /from "@\/components\/FindingsSection"/);
  assert.doesNotMatch(section, /<FindingCard/);
  assert.doesNotMatch(section, /finding-accordion-stack/);
  assert.match(card, /REF_CARD_METRIC_LABEL_CLASS/);
  assert.match(card, /REF_CARD_METRIC_CLASS/);
  assert.match(card, /rankings-insight-name/);
  assert.match(card, /View Profile/);
  assert.match(card, /tabular-nums/);
});

test("superBowlFindingCardModel maps penalty finding to dense card rows", () => {
  const finding = computeSuperBowlFindings(8).find((row) => row.id === "nfl-sb-most-penalties");
  assert.ok(finding);
  const card = superBowlFindingCardModel(finding!);
  assert.equal(card.primaryStatTitle, "Total penalties");
  assert.match(card.bigNumber, /^\d+$/);
  assert.ok(card.variancePill);
  assert.match(card.variancePill!, /vs avg/);
  assert.ok(card.officialName.length > 2);
  assert.match(card.gameContext, /Refereed Super Bowl/);
  assert.match(card.profileHref ?? "", /\/nfl\/refs\//);
});

test("formatSuperBowlVariancePill computes signed delta from baseline detail", () => {
  const pill = formatSuperBowlVariancePill({
    label: "Total penalties",
    value: "20",
    detail: "vs 12.0 reg-season avg",
  });
  assert.equal(pill, "+8 vs avg");
});

test("super bowl insight grid stacks to one column on mobile", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /\.super-bowl-insight-grid[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(
    css,
    /@media \(min-width: 640px\)[\s\S]*\.super-bowl-insight-grid[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/,
  );
});
