import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isClinicalSurfaceSource,
  scanChampagneGoldDrift,
  scanClinicalTailwindDrift,
  scanHardcodedHexDrift,
} from "./lib/color-drift-scan";

describe("color drift scan", () => {
  it("flags dim slate utilities on clinical surfaces", () => {
    const violations = scanClinicalTailwindDrift(
      "src/components/example/ClinicalCard.tsx",
      `
        export function Example() {
          return <article className="clinical-card text-slate-600">Hi</article>;
        }
      `,
    );
    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.rule, "clinical-tailwind-drift");
  });

  it("ignores dim slate utilities outside clinical surfaces", () => {
    const violations = scanClinicalTailwindDrift(
      "src/components/example/Plain.tsx",
      `<p className="text-slate-600">muted</p>`,
    );
    assert.equal(violations.length, 0);
  });

  it("detects clinical surfaces via shared class exports", () => {
    assert.equal(isClinicalSurfaceSource(`const x = REF_CARD_CLASS;`), true);
    assert.equal(isClinicalSurfaceSource(`<div className="clinical-card" />`), true);
    assert.equal(isClinicalSurfaceSource(`<div className="page-shell" />`), false);
  });

  it("flags hardcoded hex outside allowlisted token files", () => {
    const violations = scanHardcodedHexDrift(
      "src/components/example/BadHex.tsx",
      `const color = "#ff00aa";`,
    );
    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.rule, "hardcoded-hex");
  });

  it("allows hardcoded hex in brand token sources", () => {
    const violations = scanHardcodedHexDrift(
      "src/lib/brand-colors.ts",
      `export const HEADER_GOLD = "#d8b85d";`,
    );
    assert.equal(violations.length, 0);
  });

  it("flags deprecated champagne gold outside allowlist", () => {
    const violations = scanChampagneGoldDrift(
      "src/components/example/BadGold.tsx",
      `<span className="text-[#BFA86A]">Final</span>`,
    );
    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.rule, "deprecated-champagne-gold");
  });

  it("allows champagne gold in globals token definitions", () => {
    const violations = scanChampagneGoldDrift(
      "src/app/globals.css",
      `  --wc-research-accent: #bfa86a;`,
    );
    assert.equal(violations.length, 0);
  });
});
