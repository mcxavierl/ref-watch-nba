import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  scanLeagueLogoPathDrift,
  scanOgAccentDrift,
  scanStructuralBrandContracts,
} from "./lib/brand-surface-scan";

describe("brand surface scan", () => {
  it("flags raw slate utilities in SiteHeader", () => {
    const violations = scanStructuralBrandContracts(process.cwd());
    const headerSlate = violations.find((v) => v.rule === "header-slate-drift");
    assert.equal(headerSlate, undefined);
  });

  it("requires theme matrix homepage, league hub, and dark capsule routes", () => {
    const violations = scanStructuralBrandContracts(process.cwd());
    const missing = violations.filter((v) => v.rule === "theme-matrix-coverage");
    assert.equal(missing.length, 0);
  });

  it("flags league accent hex outside og-brand allowlist", () => {
    const violations = scanOgAccentDrift(
      "src/components/example/BadOgAccent.tsx",
      `const accent = "#ef3b55";`,
    );
    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.rule, "og-accent-drift");
  });

  it("allows league accent hex in og-brand source", () => {
    const violations = scanOgAccentDrift(
      "src/lib/og-brand.ts",
      `export const OG_LEAGUE_ACCENTS = { nba: "#ef3b55" };`,
    );
    assert.equal(violations.length, 0);
  });

  it("flags inline league logo paths outside registry", () => {
    const violations = scanLeagueLogoPathDrift(
      "src/components/example/BadLogo.tsx",
      `<img src="/logos/nba-logo.svg" alt="" />`,
    );
    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.rule, "league-logo-path-drift");
  });

  it("allows league logo paths in league-logo-src registry", () => {
    const violations = scanLeagueLogoPathDrift(
      "src/lib/league-logo-src.ts",
      `onDark: "/logos/nba-logo.svg",`,
    );
    assert.equal(violations.length, 0);
  });

  it("package.json exposes audit:brand-surfaces and audit:design-ship scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };
    assert.match(pkg.scripts?.["audit:brand-surfaces"] ?? "", /audit-brand-surfaces/);
    assert.match(pkg.scripts?.["audit:design-ship"] ?? "", /audit-design-ship/);
    assert.match(pkg.scripts?.["check:ci"] ?? "", /audit:design-ship/);
  });
});
