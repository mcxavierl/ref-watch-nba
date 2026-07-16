import test from "node:test";
import assert from "node:assert/strict";
import {
  formatNcaaAuditPillLabel,
  ncaaAuditVerdict,
} from "@/lib/ncaa-audit-status-display";

test("formatNcaaAuditPillLabel renders tabular coverage copy", () => {
  assert.equal(formatNcaaAuditPillLabel(100), "Audit: 100% Complete");
  assert.equal(formatNcaaAuditPillLabel(42.5), "Audit: 42.5% Complete");
});

test("ncaaAuditVerdict maps NCAA pipeline states to Clinical Modern verdicts", () => {
  assert.equal(ncaaAuditVerdict(100, { verified: true }), "pass");
  assert.equal(ncaaAuditVerdict(100), "pass");
  assert.equal(ncaaAuditVerdict(42), "caution");
  assert.equal(ncaaAuditVerdict(0, { awaitingIngest: true }), "fail");
  assert.equal(ncaaAuditVerdict(0), "fail");
});
