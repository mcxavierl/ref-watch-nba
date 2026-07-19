import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { FoulCategory } from "../../src/lib/types/foul-categories";
import {
  processFoulData,
  tagIngestFoul,
} from "./process-foul-data";

const originalWarn = console.warn;
const originalLog = console.log;
const warnings: string[] = [];
const logs: string[] = [];

afterEach(() => {
  console.warn = originalWarn;
  console.log = originalLog;
  warnings.length = 0;
  logs.length = 0;
});

function captureConsole(): void {
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
}

describe("process-foul-data", () => {
  it("tags mapped fouls and logs the category assignment", () => {
    captureConsole();
    const tagged = tagIngestFoul("nba", { foulName: "Delay of Game" });
    assert.equal((tagged as { category: FoulCategory }).category, FoulCategory.ADMIN);
    assert.equal(logs.some((line) => line.includes("Tagging foul: Delay of Game as ADMIN")), true);
    assert.equal(warnings.length, 0);
  });

  it("defaults unknown fouls to subjective and warns", () => {
    captureConsole();
    const tagged = tagIngestFoul("nfl", { rawType: "Mystery Penalty" });
    assert.equal((tagged as { category: FoulCategory }).category, FoulCategory.SUBJECTIVE);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0] ?? "", /Unrecognized NFL foul "Mystery Penalty"/);
  });

  it("preserves existing category tags without re-logging", () => {
    captureConsole();
    const tagged = tagIngestFoul("nba", {
      foulName: "Delay of Game",
      category: FoulCategory.SUBJECTIVE,
    });
    assert.equal((tagged as { category: FoulCategory }).category, FoulCategory.SUBJECTIVE);
    assert.equal(logs.length, 0);
    assert.equal(warnings.length, 0);
  });

  it("processFoulData tags each foul in order", () => {
    captureConsole();
    const tagged = processFoulData("nba", [
      { foulName: "Shooting Foul" },
      { foulName: "Custom Event" },
    ]);
    assert.equal(tagged.length, 2);
    assert.equal((tagged[0] as { category: FoulCategory }).category, FoulCategory.SUBJECTIVE);
    assert.equal((tagged[1] as { category: FoulCategory }).category, FoulCategory.SUBJECTIVE);
    assert.equal(warnings.length, 1);
  });
});
