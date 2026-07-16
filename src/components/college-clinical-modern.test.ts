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

test("CBB clinical offseason landing uses dedicated components", () => {
  const page = readFileSync("src/app/cbb/page.tsx", "utf8");
  assert.match(page, /CbbClinicalHero/);
  assert.match(page, /CbbClinicalActionTiles/);
  assert.match(page, /CbbClinicalProvenanceBanner/);
  assert.match(page, /CbbClinicalConferenceHubs/);
  assert.match(page, /CbbClinicalNotifyCallout/);
  assert.match(page, /isOffseason \?/);
  assert.doesNotMatch(page, /ProComingSoonTease/);

  const hero = readFileSync("src/components/cbb/CbbClinicalHero.tsx", "utf8");
  assert.match(hero, /offseasonTitle/);
  assert.match(hero, /LEAGUE_HERO_STATS/);
  assert.match(hero, /slateHeroStatHref/);
  assert.match(hero, /tabular-nums/);
  assert.doesNotMatch(hero, /slateHeroActions/);

  const tiles = readFileSync("src/components/cbb/CbbClinicalActionTiles.tsx", "utf8");
  assert.match(tiles, /Tendency index/);
  assert.match(tiles, /Crew matrix/);
  assert.match(tiles, /Team histories/);
  assert.match(tiles, /Season highlights/);
  assert.match(tiles, /cbb-clinical-action-grid/);

  const provenance = readFileSync(
    "src/components/cbb/CbbClinicalProvenanceBanner.tsx",
    "utf8",
  );
  assert.match(provenance, /off-season seed data only/);
  assert.match(provenance, /approx\. Nov 4/);

  const hubs = readFileSync("src/components/cbb/CbbClinicalConferenceHubs.tsx", "utf8");
  assert.match(hubs, /getConferenceCoverageRows/);
  assert.match(hubs, /Conference Hubs: Pre-Season Status/);
  assert.match(hubs, /row\.conferenceId/);

  const notify = readFileSync("src/components/cbb/CbbClinicalNotifyCallout.tsx", "utf8");
  assert.match(notify, /SeasonNotifyCta/);
  assert.match(notify, /triggerLabel/);
  assert.match(notify, /Notify me when live data backfills/);
});
