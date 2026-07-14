import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { parseBoxscorePeriodFouls } from "../../scripts/ingest/parse-boxscore-fouls";

describe("parseBoxscorePeriodFouls", () => {
  it("parses quarter fouls from cached BBR boxscore HTML", () => {
    const htmlPath = path.join(
      process.cwd(),
      "data/nba/cache/bbr/boxscore_202404030WAS.html",
    );
    if (!fs.existsSync(htmlPath)) {
      return;
    }
    const html = fs.readFileSync(htmlPath, "utf8");
    const parsed = parseBoxscorePeriodFouls(html, "WAS", "LAL");
    assert.ok(parsed);
    assert.equal(parsed.unit, "quarter");
    assert.ok(parsed.buckets.length >= 4);
    const q1 = parsed.buckets.find((bucket) => bucket.period === 1);
    assert.ok(q1);
    assert.ok(q1.home + q1.away > 0);
  });
});
