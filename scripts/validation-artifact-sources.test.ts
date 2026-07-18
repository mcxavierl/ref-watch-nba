import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  isValidationArtifactSource,
  VALIDATION_ARTIFACT_SOURCES,
} from "./validation-artifact-sources";

describe("validation artifact sources", () => {
  it("tracks game logs and backtest script", () => {
    assert.ok(isValidationArtifactSource("data/game-logs.json"));
    assert.ok(isValidationArtifactSource("scripts/backtest.ts"));
    assert.equal(isValidationArtifactSource("src/app/page.tsx"), false);
    assert.ok(VALIDATION_ARTIFACT_SOURCES.includes("data/nhl/game-logs.json"));
  });

  it("documents validation refresh on the public report page", () => {
    const content = readFileSync("src/components/ValidationReportContent.tsx", "utf8");
    assert.match(content, /validation:refresh/);
  });
});
