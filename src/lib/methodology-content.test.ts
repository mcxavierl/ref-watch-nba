import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  METHODOLOGY_PAGE_LEAD,
  METHODOLOGY_SECTIONS,
} from "@/lib/methodology-content";

const EM_DASH = "\u2014";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("methodology content", () => {
  it("defines expanded sections with sample gates and confidence tiers", () => {
    assert.ok(METHODOLOGY_SECTIONS.length >= 7);
    assert.ok(METHODOLOGY_SECTIONS.some((section) => section.id === "sample-gates"));
    assert.ok(METHODOLOGY_SECTIONS.some((section) => section.id === "advanced-metrics"));
    assert.ok(METHODOLOGY_SECTIONS.some((section) => section.id === "confidence"));
    assert.match(METHODOLOGY_PAGE_LEAD, /sample gates/i);
  });

  it("user-facing methodology copy avoids em dashes", () => {
    const files = [
      "src/lib/methodology-content.ts",
      "src/components/MethodologyPageContent.tsx",
      "src/app/methodology/page.tsx",
    ];
    for (const file of files) {
      const source = readSrc(file);
      assert.doesNotMatch(source, new RegExp(EM_DASH), file);
    }
  });
});
