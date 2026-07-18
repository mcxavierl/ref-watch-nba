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
  const cbb = readFileSync("src/components/CbbPreviewBanner.tsx", "utf8");
  assert.match(cbb, /CollegePreviewBanner/);

  const cfb = readFileSync("src/components/CfbPreviewBanner.tsx", "utf8");
  assert.match(cfb, /StatusBadge/);
  assert.match(cfb, /isCfbOfficialsPending/);

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
  assert.match(source, /NcaaConferenceLogo/);
  assert.doesNotMatch(source, /ncaa-coverage-live-item-badge/);
});

test("CBB opengraph uses hub renderer with ref-focused copy", () => {
  const ogPage = readFileSync("src/app/cbb/opengraph-image.tsx", "utf8");
  assert.match(ogPage, /renderHubOgImage/);
  assert.match(ogPage, /cbbHubOgContent/);
  const heroCopy = readFileSync("src/lib/league-hero-copy.ts", "utf8");
  assert.match(heroCopy, /College basketball officiating analytics/);
});

test("CBB hub page uses standard league slate layout", () => {
  const page = readFileSync("src/app/cbb/page.tsx", "utf8");
  assert.match(page, /LeagueSlateHero/);
  assert.match(page, /OffseasonSlateNotice/);
  assert.match(page, /BrowseActionCards/);
  assert.doesNotMatch(page, /ProComingSoonTease/);
  assert.match(page, /page-shell-slate/);
  assert.doesNotMatch(page, /CbbClinicalHero/);
  assert.doesNotMatch(page, /CbbClinicalActionTiles/);
  assert.doesNotMatch(page, /CbbClinicalProvenanceBanner/);
  assert.doesNotMatch(page, /CbbClinicalConferenceHubs/);
  assert.doesNotMatch(page, /CbbClinicalNotifyCallout/);
  assert.doesNotMatch(page, /cbb-clinical-shell/);
});
