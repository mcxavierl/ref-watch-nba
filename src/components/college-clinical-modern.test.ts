import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("NcaaAuditStatusPill delegates to shared StatusBadge", () => {
  const source = readFileSync("src/components/NcaaAuditStatusPill.tsx", "utf8");
  assert.match(source, /from "@\/components\/hub\/StatusBadge"/);
  assert.match(source, /<StatusBadge/);
  assert.match(source, /ncaaAuditVerdict/);
  assert.match(source, /tabular-nums/);
});

test("College preview banners use shared Clinical Modern banner", () => {
  for (const file of [
    "src/components/CbbPreviewBanner.tsx",
    "src/components/CfbPreviewBanner.tsx",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /CollegePreviewBanner/);
  }

  const shared = readFileSync("src/components/CollegePreviewBanner.tsx", "utf8");
  assert.match(shared, /StatusBadge/);
  assert.match(shared, /CLINICAL MODERN STANDARD/);
});

test("CollegeLeagueGate unlocks children when NCAA league is launched", () => {
  const source = readFileSync("src/components/CollegeLeagueGate.tsx", "utf8");
  assert.match(source, /isCollegeLiveLeague/);
  assert.match(source, /StatusBadge/);
  assert.match(source, /NCAA_INTEGRITY_AUDIT_HREF/);
});

test("NcaaIntegrityAuditDashboard uses Clinical Modern metric cards", () => {
  const source = readFileSync(
    "src/components/NcaaIntegrityAuditDashboard.tsx",
    "utf8",
  );
  assert.match(source, /ClinicalMetricCard/);
  assert.match(source, /StatusBadge/);
  assert.match(source, /<details className="ncaa-integrity-audit-failures"/);
});

test("ConferenceCoverage uses StatusBadge for live conference labels", () => {
  const source = readFileSync("src/components/ConferenceCoverage.tsx", "utf8");
  assert.match(source, /StatusBadge/);
  assert.doesNotMatch(source, /ncaa-coverage-live-item-badge/);
});
