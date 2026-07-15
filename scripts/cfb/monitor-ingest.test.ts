import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeCfbIngestHealth,
  classifyIngestError,
  parseCfbIngestLog,
} from "./lib/ingest-health";

describe("CFB ingest health monitor", () => {
  it("classifies explicit and inferred error types", () => {
    assert.equal(
      classifyIngestError({ type: "Network Timeout", message: "ignored" }),
      "Network Timeout",
    );
    assert.equal(
      classifyIngestError({ message: "Zod validation failed on penalties[]" }),
      "Schema Mismatch",
    );
    assert.equal(
      classifyIngestError({ message: "fetch failed: ETIMEDOUT after 30s" }),
      "Network Timeout",
    );
    assert.equal(
      classifyIngestError({ message: "404 on summary endpoint — payload shape changed" }),
      "API Change",
    );
  });

  it("alerts when schema mismatch exceeds 5% of ingested games for a conference", () => {
    const log = parseCfbIngestLog({
      generatedAt: "2026-07-14T12:00:00.000Z",
      conferences: {
        SEC: { gamesIngested: 100 },
        ACC: { gamesIngested: 200 },
      },
      errors: [
        { conference: "SEC", type: "Schema Mismatch", gameId: "1" },
        { conference: "SEC", type: "Schema Mismatch", gameId: "2" },
        { conference: "SEC", type: "Schema Mismatch", gameId: "3" },
        { conference: "SEC", type: "Schema Mismatch", gameId: "4" },
        { conference: "SEC", type: "Schema Mismatch", gameId: "5" },
        { conference: "SEC", type: "Schema Mismatch", gameId: "6" },
        { conference: "SEC", type: "Network Timeout", gameId: "7" },
        { conference: "ACC", type: "Schema Mismatch", gameId: "8" },
        { conference: "ACC", type: "API Change", gameId: "9" },
      ],
    });

    const report = analyzeCfbIngestHealth(log, "fixture/cfb-ingest.json");
    const sec = report.conferences.find((row) => row.conference === "SEC");
    const acc = report.conferences.find((row) => row.conference === "ACC");

    assert.ok(sec);
    assert.ok(acc);
    assert.equal(sec.byType["Schema Mismatch"], 6);
    assert.equal(sec.schemaMismatchAlert, true);
    assert.equal(acc.schemaMismatchAlert, false);
    assert.equal(report.healthy, false);
    assert.match(report.alerts[0] ?? "", /SEC/);
  });

  it("passes when schema mismatch stays at or below 5%", () => {
    const log = parseCfbIngestLog({
      conferences: {
        SEC: { gamesIngested: 100 },
      },
      errors: [
        { conference: "SEC", type: "Schema Mismatch", gameId: "1" },
        { conference: "SEC", type: "Schema Mismatch", gameId: "2" },
        { conference: "SEC", type: "Schema Mismatch", gameId: "3" },
        { conference: "SEC", type: "Schema Mismatch", gameId: "4" },
        { conference: "SEC", type: "Schema Mismatch", gameId: "5" },
        { conference: "SEC", type: "Network Timeout", gameId: "6" },
      ],
    });

    const report = analyzeCfbIngestHealth(log);
    assert.equal(report.healthy, true);
    assert.equal(report.alerts.length, 0);
  });

  it("excludes resolved errors from alerts while keeping audit counts", () => {
    const log = parseCfbIngestLog({
      conferences: {
        SEC: { gamesIngested: 100 },
      },
      errors: [
        { conference: "SEC", type: "Schema Mismatch", gameId: "1" },
        { conference: "SEC", type: "Schema Mismatch", gameId: "2", resolved: true },
        { conference: "SEC", type: "Schema Mismatch", gameId: "3", resolved: true },
        { conference: "SEC", type: "Schema Mismatch", gameId: "4", resolved: true },
        { conference: "SEC", type: "Schema Mismatch", gameId: "5", resolved: true },
        { conference: "SEC", type: "Schema Mismatch", gameId: "6", resolved: true },
        { conference: "SEC", type: "Schema Mismatch", gameId: "7", resolved: true },
      ],
    });

    const report = analyzeCfbIngestHealth(log);
    const sec = report.conferences.find((row) => row.conference === "SEC");

    assert.ok(sec);
    assert.equal(sec.byType["Schema Mismatch"], 1);
    assert.equal(sec.schemaMismatchAlert, false);
    assert.equal(report.resolvedErrors, 6);
    assert.equal(report.healthy, true);
  });
});
