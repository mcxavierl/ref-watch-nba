import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  angleHeadline,
  dedupeFindingStats,
  extractOfficialFromFinding,
  groupFindingsForFeed,
  mergeGroupPreviewStats,
  statsForAngleBlock,
} from "@/lib/finding-grouping";
import type { Finding } from "@/lib/findings-shared";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "test-finding",
    category: "ref-outlier",
    headline: "Mike Leggo runs hot on combined scoring",
    summary: "Summary",
    stats: [
      { label: "Over benchmark", value: "58.2%" },
      { label: "Avg goals", value: "6.4" },
    ],
    sampleNote: "119 games · 2016-17–2025-26",
    links: [{ label: "Mike Leggo", href: "/nhl/refs/mike-leggo-20" }],
    ...overrides,
  };
}

describe("finding grouping", () => {
  it("extracts a single official from a ref profile link", () => {
    const official = extractOfficialFromFinding(makeFinding());
    assert.ok(official);
    assert.equal(official.name, "Mike Leggo");
    assert.equal(official.key, "mike-leggo-20");
  });

  it("returns null for multi-ref scoring extremes", () => {
    const official = extractOfficialFromFinding(
      makeFinding({
        category: "scoring-extreme",
        links: [
          { label: "Ref A", href: "/nhl/refs/ref-a" },
          { label: "Ref B", href: "/nhl/refs/ref-b" },
        ],
      }),
    );
    assert.equal(official, null);
  });

  it("dedupes identical metric labels and values", () => {
    const stats = dedupeFindingStats([
      { label: "Over benchmark", value: "58.2%" },
      { label: "over benchmark", value: "58.2%" },
      { label: "Avg goals", value: "6.4" },
    ]);
    assert.equal(stats.length, 2);
  });

  it("groups multiple findings for the same official", () => {
    const feed = groupFindingsForFeed([
      makeFinding({
        id: "a",
        category: "whistle-extreme",
        headline: "Mike Leggo whistles fewer minors",
      }),
      makeFinding({
        id: "b",
        category: "ref-outlier",
        headline: "Mike Leggo runs hot on combined scoring",
      }),
      makeFinding({
        id: "c",
        category: "team-crew",
        headline: "Toronto crew leans under",
        links: [{ label: "Toronto", href: "/nhl/teams/TOR" }],
      }),
    ]);

    assert.equal(feed.length, 2);
    assert.equal(feed[0].kind, "official");
    if (feed[0].kind === "official") {
      assert.equal(feed[0].findings.length, 2);
      assert.equal(feed[0].official.name, "Mike Leggo");
    }
    assert.equal(feed[1].kind, "standalone");
  });

  it("strips redundant official names from grouped angle headlines", () => {
    const headline = angleHeadline(
      makeFinding({ headline: "Mike Leggo runs hot on combined scoring" }),
      "Mike Leggo",
    );
    assert.equal(headline, "Runs hot on combined scoring");
  });

  it("merges preview stats without repeating labels across angles", () => {
    const preview = mergeGroupPreviewStats([
      makeFinding({
        stats: [
          { label: "Over benchmark", value: "58.2%" },
          { label: "Avg goals", value: "6.4" },
        ],
      }),
      makeFinding({
        stats: [
          { label: "Over benchmark", value: "61.0%" },
          { label: "Minors per team", value: "8.1" },
        ],
      }),
    ]);

    assert.equal(preview.length, 3);
    assert.equal(
      preview.filter((stat) => stat.label.toLowerCase() === "over benchmark")
        .length,
      1,
    );
    assert.equal(preview[0]?.value, "58.2%");
  });

  it("drops duplicate metrics from later angle blocks", () => {
    const findings = [
      makeFinding({
        id: "a",
        stats: [
          { label: "Over benchmark", value: "58.2%" },
          { label: "Avg goals", value: "6.4" },
        ],
      }),
      makeFinding({
        id: "b",
        category: "whistle-extreme",
        stats: [
          { label: "Over benchmark", value: "58.2%" },
          { label: "Minors per team", value: "8.1" },
        ],
      }),
    ];

    const secondAngle = statsForAngleBlock(findings[1]!, findings, 1);
    assert.equal(secondAngle.length, 1);
    assert.equal(secondAngle[0]?.label, "Minors per team");
  });
});
