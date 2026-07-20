import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAuditCorpus,
  formatAuditMarkdown,
  runMarketEfficiencyAudit,
} from "./market-efficiency-audit";

describe("market-efficiency-audit", () => {
  it("builds a non-empty corpus from stored game logs", () => {
    const records = buildAuditCorpus();
    assert.ok(records.length > 1000, `expected joined games, got ${records.length}`);
    for (const record of records.slice(0, 20)) {
      assert.equal(record.lineSource, "external");
      assert.ok(Number.isFinite(record.marketTotalDelta));
      assert.ok(record.closingTotal > 0);
    }
  });

  it("produces summary rows for each league signal", () => {
    const report = runMarketEfficiencyAudit();
    assert.ok(report.rows.length >= 6);
    const nflGsni = report.rows.find(
      (row) => row.league === "NFL" && row.signal === "gsni_score",
    );
    assert.ok(nflGsni);
    assert.ok(nflGsni!.sampleSize > 100);
  });

  it("renders markdown with the summary table", () => {
    const report = runMarketEfficiencyAudit();
    const markdown = formatAuditMarkdown(report);
    assert.match(markdown, /Predictive power summary/);
    assert.match(markdown, /Market efficient\?/);
    assert.match(markdown, /Crew whistle delta/);
  });
});
