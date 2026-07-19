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
  const ogPage = readFileSync("src/app/[league]/opengraph-image.tsx", "utf8");
  assert.match(ogPage, /renderHubOgImage/);
  assert.match(ogPage, /cbbHubOgContent|hubOgContentForLeague/);
  const heroCopy = readFileSync("src/lib/league-hero-copy.ts", "utf8");
  assert.match(heroCopy, /College basketball officiating analytics/);
});

test("CBB hub page uses standard league slate layout", () => {
  const page = readFileSync("src/app/[league]/page.tsx", "utf8");
  const slate = readFileSync("src/components/LeagueSlatePage.tsx", "utf8");
  assert.match(page, /LeagueSlatePage/);
  assert.match(slate, /LeagueSlateHero/);
  assert.match(slate, /OffseasonSlateNotice/);
  assert.match(slate, /BrowseActionCards/);
  assert.doesNotMatch(slate, /ProComingSoonTease/);
  assert.match(slate, /page-shell-slate/);
  assert.doesNotMatch(slate, /CbbClinicalHero/);
});
