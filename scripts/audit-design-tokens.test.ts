import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  collectDefinitionsFromSources,
  extractVarDefinitions,
  extractVarReferences,
  isGuardedToken,
  scanFigmaTokenParity,
  scanGuardedTokenReferences,
  scanWcTokenOrphans,
} from "./lib/design-token-scan";

function writeFixture(root: string, relPath: string, content: string): void {
  const abs = join(root, relPath);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content, "utf8");
}

describe("design token scan", () => {
  it("detects guarded token families", () => {
    assert.equal(isGuardedToken("--clinical-ink"), true);
    assert.equal(isGuardedToken("--accent-brand"), true);
    assert.equal(isGuardedToken("--wc-research-accent"), true);
    assert.equal(isGuardedToken("--text-primary"), false);
  });

  it("extracts CSS variable definitions and references", () => {
    const css = `
      :root {
        --accent-brand: #2563eb;
        color: var(--clinical-ink);
      }
    `;
    assert.deepEqual([...extractVarDefinitions(css)], ["--accent-brand"]);
    assert.deepEqual([...extractVarReferences(css)], ["--clinical-ink"]);
  });

  it("flags undefined guarded token references", () => {
    const violations = scanGuardedTokenReferences(
      "src/components/example.css",
      `.card { color: var(--clinical-ink-missing); }`,
      new Set(["--clinical-ink"]),
    );
    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.rule, "guarded-token-undefined");
  });

  it("allows guarded tokens that exist in token sources", () => {
    const violations = scanGuardedTokenReferences(
      "src/components/example.css",
      `.card { color: var(--accent-brand); }`,
      new Set(["--accent-brand"]),
    );
    assert.equal(violations.length, 0);
  });

  it("loads canonical token definitions from theme sources", () => {
    const definitions = collectDefinitionsFromSources(process.cwd());
    assert.equal(definitions.has("--clinical-ink"), true);
    assert.equal(definitions.has("--accent-positive"), true);
    assert.equal(definitions.has("--wc-research-accent"), true);
    assert.equal(definitions.has("--wc-capsule-ink"), true);
    assert.equal(definitions.has("--wc-gold"), true);
  });

  it("validates figma semantic colors against globals.css", () => {
    const defined = collectDefinitionsFromSources(process.cwd());
    const violations = scanFigmaTokenParity(process.cwd(), defined);
    const semanticDrift = violations.filter((v) => v.rule === "figma-semantic-drift");
    const tokenDrift = violations.filter((v) => v.rule === "figma-token-drift");
    assert.equal(semanticDrift.length, 0, semanticDrift.map((v) => v.excerpt).join("; "));
    assert.equal(tokenDrift.length, 0, tokenDrift.map((v) => v.excerpt).join("; "));
  });

  it("flags wc capsule tokens defined outside worldcup-delight.css", () => {
    const root = mkdtempSync(join(tmpdir(), "design-token-scan-"));
    writeFixture(
      root,
      "src/components/bad.css",
      `.wc { --wc-capsule-ink: #fff; color: var(--wc-capsule-ink); }`,
    );

    const violations = scanWcTokenOrphans(root, ["src/components/bad.css"]);
    assert.equal(violations.some((v) => v.rule === "wc-capsule-misplaced"), true);
    assert.equal(violations.some((v) => v.rule === "wc-token-orphan"), true);
  });
});
