#!/usr/bin/env npx tsx
/**
 * Ref Watch link & data dependency audit.
 *
 * Offline (default): routes, JSON shards, slug hygiene, matrix empty-state guards.
 * Live (--live): HTTP smoke against production/staging for 404/5xx/110x regressions.
 *
 * Usage:
 *   npm run audit:links
 *   npm run audit:links -- --live
 *   npm run audit:links -- --logos
 *   npm run audit:links -- --live --origin=https://refwatch.ca
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  getAllRefSlugs,
  getRefBySlug,
  getRefStats,
  getTeamSplits as getNbaTeamSplits,
} from "@/lib/data";
import {
  getAllRefSlugs as getNhlRefSlugs,
  getRefBySlug as getNhlRefBySlug,
  getRefStats as getNhlRefStats,
  getTeamSplits as getNhlTeamSplits,
} from "@/lib/nhl/data";
import {
  getAllRefSlugs as getNflRefSlugs,
  getRefBySlug as getNflRefBySlug,
  getRefStats as getNflRefStats,
  getTeamSplits as getNflTeamSplits,
} from "@/lib/nfl/data";
import {
  getAllRefSlugs as getEplRefSlugs,
  getRefBySlug as getEplRefBySlug,
  getRefStats as getEplRefStats,
  getTeamSplits as getEplTeamSplits,
} from "@/lib/epl/data";
import {
  getAllRefSlugs as getLaligaRefSlugs,
  getRefBySlug as getLaligaRefBySlug,
  getRefStats as getLaligaRefStats,
  getTeamSplits as getLaligaTeamSplits,
} from "@/lib/laliga/data";
import {
  getAllRefSlugs as getCbbRefSlugs,
  getRefBySlug as getCbbRefBySlug,
  getRefStats as getCbbRefStats,
  getTeamSplits as getCbbTeamSplits,
} from "@/lib/cbb/data";
import {
  getAllRefSlugs as getCfbRefSlugs,
  getRefBySlug as getCfbRefBySlug,
  getRefStats as getCfbRefStats,
  getTeamSplits as getCfbTeamSplits,
} from "@/lib/cfb/data";
import { researchFindingHref } from "@/lib/findings-shared";
import { insightDrilldownAssetPath } from "@/lib/insight-drilldown-types";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";
import { LEAGUES, leagueHref, refProfileHref, type LeagueId } from "@/lib/leagues";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import {
  matrixCellKey,
  MATRIX_MIN_GAMES,
} from "@/lib/ref-team-matrix";
import { computeRefTeamMatrix } from "@/lib/ref-team-matrix-compute";
import { getAllResearchFindingIds, getResearchFindingById } from "@/lib/research";
import {
  appRouteModuleCandidates,
  canonicalSiteRoutePaths,
  HUB_SEGMENTS,
  ROUTED_LEAGUE_IDS,
  siteNavHrefPaths,
  siteRouteRedirects,
} from "@/lib/site-route-config";
import { NBA_TEAMS, teamFullName } from "@/lib/teams";
import { NHL_TEAMS } from "@/lib/nhl/teams";
import { NFL_TEAMS } from "@/lib/nfl/teams";
import { EPL_TEAMS } from "@/lib/epl/teams";
import { LALIGA_TEAMS } from "@/lib/laliga/teams";
import { CBB_TEAMS } from "@/lib/cbb/teams";
import { CFB_TEAMS } from "@/lib/cfb/teams";
import { teamLogoUrl as cbbTeamLogoUrl } from "@/lib/cbb/teams";
import { teamLogoUrl as cfbTeamLogoUrl } from "@/lib/cfb/teams";
import { teamLogoUrl as eplTeamLogoUrl } from "@/lib/epl/teams";
import { teamLogoUrl as laligaTeamLogoUrl } from "@/lib/laliga/teams";
import { teamLogoUrl as nflTeamLogoUrl } from "@/lib/nfl/teams";
import { teamLogoUrl as nhlTeamLogoUrl } from "@/lib/nhl/teams";
import { teamLogoUrl as nbaTeamLogoUrl } from "@/lib/teams";
import { teamLogoUrl as wnbaTeamLogoUrl } from "@/lib/wnba/teams";
import { WNBA_TEAMS } from "@/lib/wnba/teams";
import type { RefProfile, RefStatsFile, TeamCrewSplit } from "@/lib/types";
import { refSlug } from "./lib/slug";

const ROOT = process.cwd();
const APP_DIR = join(ROOT, "src", "app");
const PUBLIC_DATA = join(ROOT, "public", "data");

const REF_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*-\d+$/;
const TEAM_ABBR_RE = /^[A-Z0-9]{2,5}$/;
const LEAGUE_ID_RE = /^[a-z][a-z0-9]*$/;
const BAD_LEAGUE_FOLDER_NAMES = new Set(["la-liga", "la_liga", "premier-league", "premier_league"]);

const LIVE = process.argv.includes("--live");
const LOGOS = process.argv.includes("--logos") || LIVE;
const VERBOSE = process.argv.includes("--verbose");
const ORIGIN = (
  process.argv.find((a) => a.startsWith("--origin="))?.split("=")[1] ??
  process.env.REFWATCH_DEPLOY_URL ??
  "https://refwatch.ca"
).replace(/\/$/, "");

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

type Severity = "error" | "warn" | "info";
type Finding = { severity: Severity; phase: string; message: string };

const findings: Finding[] = [];

function record(severity: Severity, phase: string, message: string): void {
  findings.push({ severity, phase, message });
}

function pass(phase: string, message: string): void {
  if (VERBOSE) {
    console.log(`${c.dim}  ✓ ${message}${c.reset}`);
  }
  void phase;
}

function printHeader(title: string): void {
  console.log(`\n${c.bold}${c.cyan}▸ ${title}${c.reset}`);
}

type LeagueAuditConfig = {
  id: LeagueId;
  getRefStats: () => RefStatsFile;
  getRefSlugs: () => string[];
  getRefBySlug: (slug: string) => RefProfile | null | undefined;
  getTeamSplits: (abbr: string) => TeamCrewSplit[];
  teams: Array<{ abbr: string; name?: string; city?: string; nbaId?: number }>;
  publicSubdir: string;
  teamLabel: (team: { abbr: string; name?: string; city?: string }) => string;
};

const LEAGUE_CONFIGS: LeagueAuditConfig[] = [
  {
    id: "nba",
    getRefStats,
    getRefSlugs: getAllRefSlugs,
    getRefBySlug,
    getTeamSplits: getNbaTeamSplits,
    teams: NBA_TEAMS,
    publicSubdir: "nba",
    teamLabel: (t) => teamFullName(t as (typeof NBA_TEAMS)[number]),
  },
  {
    id: "nhl",
    getRefStats: getNhlRefStats,
    getRefSlugs: getNhlRefSlugs,
    getRefBySlug: getNhlRefBySlug,
    getTeamSplits: getNhlTeamSplits,
    teams: NHL_TEAMS,
    publicSubdir: "nhl",
    teamLabel: (t) => `${t.city ?? ""} ${t.name ?? t.abbr}`.trim(),
  },
  {
    id: "nfl",
    getRefStats: getNflRefStats,
    getRefSlugs: getNflRefSlugs,
    getRefBySlug: getNflRefBySlug,
    getTeamSplits: getNflTeamSplits,
    teams: NFL_TEAMS,
    publicSubdir: "nfl",
    teamLabel: (t) => `${t.city ?? ""} ${t.name ?? t.abbr}`.trim(),
  },
  {
    id: "epl",
    getRefStats: getEplRefStats,
    getRefSlugs: getEplRefSlugs,
    getRefBySlug: getEplRefBySlug,
    getTeamSplits: getEplTeamSplits,
    teams: EPL_TEAMS,
    publicSubdir: "epl",
    teamLabel: (t) => t.name ?? t.abbr,
  },
  {
    id: "laliga",
    getRefStats: getLaligaRefStats,
    getRefSlugs: getLaligaRefSlugs,
    getRefBySlug: getLaligaRefBySlug,
    getTeamSplits: getLaligaTeamSplits,
    teams: LALIGA_TEAMS,
    publicSubdir: "laliga",
    teamLabel: (t) => t.name ?? t.abbr,
  },
  {
    id: "cbb",
    getRefStats: getCbbRefStats,
    getRefSlugs: getCbbRefSlugs,
    getRefBySlug: getCbbRefBySlug,
    getTeamSplits: getCbbTeamSplits,
    teams: CBB_TEAMS,
    publicSubdir: "cbb",
    teamLabel: (t) => t.name ?? t.abbr,
  },
  {
    id: "cfb",
    getRefStats: getCfbRefStats,
    getRefSlugs: getCfbRefSlugs,
    getRefBySlug: getCfbRefBySlug,
    getTeamSplits: getCfbTeamSplits,
    teams: CFB_TEAMS,
    publicSubdir: "cfb",
    teamLabel: (t) => t.name ?? t.abbr,
  },
];

function pageModuleExists(routePath: string): boolean {
  return appRouteModuleCandidates(routePath).some((rel) => existsSync(join(ROOT, rel)));
}

function hrefResolves(href: string): boolean {
  const normalized = href.replace(/\/$/, "") || "/";
  if (pageModuleExists(normalized)) return true;
  return resolveNavHref(normalized) !== null;
}

function resolveNavHref(href: string): string | null {
  const normalized = href.replace(/\/$/, "") || "/";
  if (pageModuleExists(normalized)) return normalized;
  for (const rule of siteRouteRedirects()) {
    if (rule.source === normalized) return rule.destination;
    if (rule.source.endsWith("/:path*")) {
      const base = rule.source.replace("/:path*", "");
      if (normalized === base || normalized.startsWith(`${base}/`)) {
        return rule.destination;
      }
    }
  }
  return null;
}

function discoverAppRoutePatterns(): string[] {
  const patterns = new Set<string>();

  function walk(dir: string, urlParts: string[]): void {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      if (entry.startsWith("(") || entry === "api") continue;

      const nextParts =
        entry.startsWith("[") && entry.endsWith("]")
          ? [...urlParts, `{${entry.slice(1, -1)}}`]
          : [...urlParts, entry];

      const pageFile = join(full, "page.tsx");
      if (existsSync(pageFile)) {
        const path = nextParts.length === 0 ? "/" : `/${nextParts.join("/")}`;
        patterns.add(path);
      }
      walk(full, nextParts);
    }
  }

  if (existsSync(join(APP_DIR, "page.tsx"))) patterns.add("/");
  walk(APP_DIR, []);
  return [...patterns].sort();
}

function auditRouteMap(): void {
  printHeader("1. Application route map");

  const patterns = discoverAppRoutePatterns();
  pass("routes", `Discovered ${patterns.length} App Router page patterns`);
  if (VERBOSE) {
    for (const p of patterns) console.log(`${c.dim}    ${p}${c.reset}`);
  }

  for (const path of canonicalSiteRoutePaths()) {
    if (!pageModuleExists(path)) {
      record("error", "routes", `Missing page module for canonical route ${path}`);
    }
  }

  for (const href of siteNavHrefPaths()) {
    if (!resolveNavHref(href)) {
      record("error", "routes", `Site nav href does not resolve: ${href}`);
    }
  }

  const expectedDynamic = [
    "/refs/{slug}",
    "/teams/{abbr}",
    "/research/{id}",
    ...ROUTED_LEAGUE_IDS.flatMap((id) => {
      const prefix = LEAGUES[id].pathPrefix;
      return [
        `${prefix || ""}/refs/{slug}`.replace("//", "/"),
        `${prefix}/teams/{abbr}`,
        `${prefix}/research/{id}`,
      ].map((p) => (p.startsWith("/") ? p : `/${p}`));
    }),
  ];

  for (const expected of expectedDynamic) {
    if (!patterns.includes(expected)) {
      record("warn", "routes", `Expected dynamic route pattern not found: ${expected}`);
    }
  }

  const insightsPages = patterns.filter((p) => p.endsWith("/insights"));
  for (const insightsPath of insightsPages) {
    const rankingsPath = insightsPath.replace(/\/insights$/, "/rankings");
    if (!patterns.includes(rankingsPath)) {
      record(
        "warn",
        "routes",
        `${insightsPath} exists but ${rankingsPath} missing (insights should redirect to rankings)`,
      );
    }
  }
}

function requiredPublicAssets(league: LeagueAuditConfig): string[] {
  const base = join(PUBLIC_DATA, league.publicSubdir);
  const files = [
    join(base, "ref-stats.json"),
    join(base, "team-splits.json"),
  ];
  if ((VERIFIED_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(league.id)) {
    files.push(join(base, "game-logs.json"));
  }
  return files;
}

function auditShards(): void {
  printHeader("2. Data shard availability");

  if (!existsSync(join(PUBLIC_DATA, "baselines.json"))) {
    record("error", "shards", "Missing public/data/baselines.json");
  }

  for (const league of LEAGUE_CONFIGS) {
    const isPreview = league.id === "cbb" || league.id === "cfb";
    for (const file of requiredPublicAssets(league)) {
      if (!existsSync(file)) {
        const rel = relative(ROOT, file);
        if (isPreview && rel.endsWith("team-splits.json")) {
          record("warn", "shards", `Optional preview asset missing: ${rel}`);
        } else {
          record("error", "shards", `Missing asset: ${rel}`);
        }
        continue;
      }
      try {
        const raw = readFileSync(file, "utf8");
        JSON.parse(raw);
        pass("shards", `Valid JSON: ${relative(ROOT, file)}`);
      } catch (err) {
        record("error", "shards", `Corrupt JSON: ${relative(ROOT, file)} (${err})`);
      }
    }

    const stats = league.getRefStats();
    const slugs = league.getRefSlugs();
    if (slugs.length === 0) {
      record("warn", "shards", `${league.id}: ref-stats has zero ref slugs`);
    }

    for (const slug of slugs) {
      const profile = league.getRefBySlug(slug);
      if (!profile) {
        record("error", "shards", `${league.id}: slug in index but getRefBySlug miss: ${slug}`);
      }
    }

    for (const team of league.teams) {
      const splits = league.getTeamSplits(team.abbr);
      if (splits.length === 0 && (VERIFIED_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(league.id)) {
        record("warn", "shards", `${league.id}: no team-splits for ${team.abbr}`);
      }
    }

    const embeddedKeys = Object.keys(stats.teamSplits ?? {});
    if (embeddedKeys.length > 0 && (VERIFIED_LIVE_LEAGUE_IDS as readonly LeagueId[]).includes(league.id)) {
      record(
        "warn",
        "shards",
        `${league.id}: ref-stats-core still embeds ${embeddedKeys.length} teamSplits keys (prefer sidecar)`,
      );
    }
  }

  const insightsPath = join(ROOT, "data", "overview-insights.json");
  if (!existsSync(insightsPath)) {
    record("error", "shards", "Missing data/overview-insights.json");
    return;
  }

  const { cards } = JSON.parse(readFileSync(insightsPath, "utf8")) as {
    cards: LeagueInsightCard[];
  };

  for (const card of cards) {
    if (!card.drilldownId) continue;
    const rel = `public/data/overview/drilldown/${card.drilldownId}.json`;
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      record("error", "shards", `Missing drilldown shard for ${card.leagueId}: ${rel}`);
    }
    const assetPath = insightDrilldownAssetPath(card.drilldownId);
    if (!existsSync(join(ROOT, "public", assetPath.slice(1)))) {
      record("error", "shards", `Drilldown asset path missing on disk: ${assetPath}`);
    }
  }
  pass("shards", `Checked ${cards.length} overview insight drilldown shards`);
}

function auditSlugHygiene(): void {
  printHeader("3. Slug & casing sanity");

  for (const league of LEAGUE_CONFIGS) {
    const stats = league.getRefStats();
    for (const ref of stats.refs) {
      if (!REF_SLUG_RE.test(ref.slug)) {
        record("error", "slugs", `${league.id}: invalid ref slug format "${ref.slug}"`);
      }
      if (ref.slug !== ref.slug.toLowerCase()) {
        record("error", "slugs", `${league.id}: ref slug not lowercase: ${ref.slug}`);
      }
      if (/\s/.test(ref.slug)) {
        record("error", "slugs", `${league.id}: ref slug contains whitespace: ${ref.slug}`);
      }
      const expected = refSlug(ref.name, ref.number ?? 0);
      if (expected !== ref.slug) {
        record(
          "warn",
          "slugs",
          `${league.id}: slug mismatch for ${ref.name} #${ref.number ?? 0}: stored=${ref.slug} expected=${expected}`,
        );
      }
      const href = refProfileHref(league.id, ref.slug);
      if (league.id !== "nba" && href.startsWith("/refs/")) {
        record("error", "slugs", `${league.id}: ${ref.slug} resolves to NBA path ${href}`);
      }
    }

    for (const team of league.teams) {
      if (!TEAM_ABBR_RE.test(team.abbr)) {
        record("warn", "slugs", `${league.id}: unusual team abbr "${team.abbr}"`);
      }
    }

    if (!LEAGUE_ID_RE.test(league.id)) {
      record("error", "slugs", `League id has invalid casing/format: ${league.id}`);
    }
  }

  const scanDirs = [join(ROOT, "public", "data"), join(ROOT, "data")];
  for (const dir of scanDirs) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const name = entry.name.toLowerCase();
      if (BAD_LEAGUE_FOLDER_NAMES.has(name)) {
        record("warn", "slugs", `Suspicious league folder name: ${join(relative(ROOT, dir), entry.name)}`);
      }
    }
  }

  if (!LEAGUE_CONFIGS.some((l) => l.id === "laliga")) {
    record("error", "slugs", "La Liga league config missing from audit registry");
  }
}

function auditInternalLinks(): void {
  printHeader("4. Internal link matrix");

  const insightsPath = join(ROOT, "data", "overview-insights.json");
  if (existsSync(insightsPath)) {
    const { cards } = JSON.parse(readFileSync(insightsPath, "utf8")) as {
      cards: LeagueInsightCard[];
    };
    for (const card of cards) {
      for (const link of card.links) {
        if (!link.href.startsWith("/")) continue;
        if (!hrefResolves(link.href)) {
          record("error", "links", `Insight card link unresolved: ${link.href} (${card.leagueId})`);
        }
      }
      if (card.entityHref && !card.entityHref.startsWith("http")) {
        const league = LEAGUE_CONFIGS.find((l) => l.id === card.leagueId);
        const profile = league?.getRefBySlug(card.refSlug ?? "");
        if (card.refSlug && !profile) {
          record("error", "links", `${card.leagueId}: insight refSlug missing in data: ${card.refSlug}`);
        }
      }
    }
  }

  for (const league of LEAGUE_CONFIGS) {
    const prefix = LEAGUES[league.id].pathPrefix;
    for (const segment of HUB_SEGMENTS) {
      const path = leagueHref(league.id, `/${segment}`);
      if (segment === "insights") {
        const dest = resolveNavHref(path);
        const expected = leagueHref(league.id, "/rankings");
        if (dest && dest !== expected && dest !== path) {
          record("warn", "links", `${path} redirects to ${dest}, expected ${expected}`);
        }
        continue;
      }
      if (!hrefResolves(path)) {
        record("error", "links", `Hub route missing: ${path}`);
      }
    }

    for (const slug of league.getRefSlugs().slice(0, 3)) {
      const href = refProfileHref(league.id, slug);
      if (!hrefResolves(href)) {
        record("error", "links", `Ref profile route does not resolve: ${href}`);
      }
    }

    const sampleTeam = league.teams[0];
    if (sampleTeam) {
      const teamHref = leagueHref(league.id, `/teams/${sampleTeam.abbr}`);
      if (!hrefResolves(teamHref)) {
        record("error", "links", `Team route does not resolve: ${teamHref}`);
      }
    }
  }

  for (const id of getAllResearchFindingIds()) {
    const finding = getResearchFindingById(id);
    if (!finding) {
      record("error", "links", `Research finding id in index but not loadable: ${id}`);
      continue;
    }
    const href = researchFindingHref(finding);
    if (!hrefResolves(href)) {
      record("warn", "links", `Research href may not resolve: ${href}`);
    }
  }
}

function auditMatrixDefensiveness(): void {
  printHeader("5. Matrix empty-state defensiveness");

  const matrixSource = readFileSync(
    join(ROOT, "src", "components", "RefTeamMatrix.tsx"),
    "utf8",
  );
  const requiredSnippets = [
    "ref-matrix-cell--empty",
    "ref-matrix-team-panel-empty",
    "Clear search or browse rankings",
    "No qualified",
  ];
  for (const snippet of requiredSnippets) {
    if (!matrixSource.includes(snippet)) {
      record("error", "matrix", `RefTeamMatrix missing empty-state guard: "${snippet}"`);
    }
  }

  for (const league of LEAGUE_CONFIGS) {
    try {
      const stats = league.getRefStats();
      const matrix = computeRefTeamMatrix(
        stats,
        league.teams.map((team) => ({
          abbr: team.abbr,
          label: league.teamLabel(team),
          name: team.name ?? team.abbr,
          nbaId: "nbaId" in team ? (team as { nbaId?: number }).nbaId : undefined,
        })),
        league.getTeamSplits,
        undefined,
        { league: league.id },
      );

      pass("matrix", `${league.id}: computeRefTeamMatrix OK (${matrix.refs.length} refs, ${matrix.qualifiedCellCount} qualified cells)`);

      const bogusTeam = "ZZZ";
      const bogusRef = "nonexistent-official-99999";
      const missingCell = matrix.cells[matrixCellKey(bogusRef, bogusTeam)];
      if (missingCell) {
        record("warn", "matrix", `${league.id}: unexpected cell for bogus ref×team pair`);
      }

      const sampleTeam = league.teams[0]?.abbr ?? "XXX";
      const sampleRef = matrix.refs[0]?.slug ?? "nobody-0";
      const thinCell = matrix.cells[matrixCellKey(sampleRef, sampleTeam)];
      if (thinCell && thinCell.games > 0 && thinCell.games < MATRIX_MIN_GAMES && !thinCell.thinSample) {
        record(
          "warn",
          "matrix",
          `${league.id}: thin sample cell missing thinSample flag (${sampleRef}×${sampleTeam})`,
        );
      }
    } catch (err) {
      record("error", "matrix", `${league.id}: computeRefTeamMatrix threw: ${err}`);
    }
  }

  const matrixPages = ROUTED_LEAGUE_IDS.map((id) => `${LEAGUES[id].pathPrefix}/matrix`);
  for (const path of matrixPages) {
    if (!pageModuleExists(path)) {
      record("error", "matrix", `Matrix page missing: ${path}`);
    }
  }
}

const ERROR_BODY_PATTERNS = [
  { label: "1102", re: /Error 1102|error code: 1102|Worker exceeded resource limits/i },
  { label: "1101", re: /Error 1101|error code: 1101|Worker threw exception/i },
  { label: "next-error", re: /<title>\s*500\b|id="nextjs__container_errors"|__NEXT_ERROR__/i },
  { label: "cf-5xx", re: /<title>\s*5\d\d\b[^<]*cloudflare/i },
];

const LOCAL_LEAGUE_LOGOS = [
  "/logos/nba-logo.svg",
  "/logos/nba-logo-light.svg",
  "/logos/nfl-shield.svg",
  "/logos/epl-lion.svg",
  "/logos/epl-lion-dark.svg",
  "/logos/laliga-white.png",
  "/logos/laliga-red.png",
  "/logos/wnba-logo.svg",
  "/logos/wnba-logo-light.svg",
  "/assets/logos/ncaa.svg",
] as const;

type TeamLogoCheck = {
  league: string;
  abbr: string;
  url: string;
};

function collectTeamLogoChecks(): TeamLogoCheck[] {
  const checks: TeamLogoCheck[] = [];

  for (const team of NBA_TEAMS) {
    checks.push({ league: "nba", abbr: team.abbr, url: nbaTeamLogoUrl(team.nbaId) });
  }
  for (const team of NHL_TEAMS) {
    checks.push({ league: "nhl", abbr: team.abbr, url: nhlTeamLogoUrl(team.abbr, "dark") });
    checks.push({ league: "nhl", abbr: team.abbr, url: nhlTeamLogoUrl(team.abbr, "light") });
  }
  for (const team of NFL_TEAMS) {
    checks.push({ league: "nfl", abbr: team.abbr, url: nflTeamLogoUrl(team.abbr) });
  }
  for (const team of EPL_TEAMS) {
    checks.push({ league: "epl", abbr: team.abbr, url: eplTeamLogoUrl(team.abbr) });
  }
  for (const team of LALIGA_TEAMS) {
    checks.push({ league: "laliga", abbr: team.abbr, url: laligaTeamLogoUrl(team.abbr) });
  }
  for (const team of CBB_TEAMS) {
    checks.push({ league: "cbb", abbr: team.abbr, url: cbbTeamLogoUrl(team.abbr) });
  }
  for (const team of CFB_TEAMS) {
    checks.push({ league: "cfb", abbr: team.abbr, url: cfbTeamLogoUrl(team.abbr) });
  }
  for (const team of WNBA_TEAMS) {
    checks.push({ league: "wnba", abbr: team.abbr, url: wnbaTeamLogoUrl(team.abbr, "dark") });
    checks.push({ league: "wnba", abbr: team.abbr, url: wnbaTeamLogoUrl(team.abbr, "light") });
  }

  return checks;
}

function auditLocalLeagueLogos(): void {
  printHeader("6. League logo assets (local)");

  for (const assetPath of LOCAL_LEAGUE_LOGOS) {
    const diskPath = join(ROOT, "public", assetPath.slice(1));
    if (!existsSync(diskPath)) {
      record("error", "logos", `Missing local league logo: ${assetPath}`);
    }
  }

  const checks = collectTeamLogoChecks();
  let empty = 0;
  for (const check of checks) {
    if (!check.url.trim()) {
      empty += 1;
      record("error", "logos", `${check.league}: empty team logo URL for ${check.abbr}`);
    }
  }

  pass("logos", `Checked ${LOCAL_LEAGUE_LOGOS.length} local league marks and ${checks.length} team logo URLs (${empty} empty)`);
}

async function auditRemoteTeamLogos(): Promise<void> {
  printHeader("7. Team logo HTTP availability");

  const checks = collectTeamLogoChecks().filter((check) => check.url.trim());
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  let checked = 0;

  for (const check of checks) {
    try {
      let res = await fetch(check.url, {
        method: "HEAD",
        redirect: "follow",
        headers: { "User-Agent": "RefWatch-AuditLinks/1.0" },
      });
      if (res.status === 405 || res.status === 403) {
        res = await fetch(check.url, {
          method: "GET",
          redirect: "follow",
          headers: { "User-Agent": "RefWatch-AuditLinks/1.0" },
        });
      }
      if (res.status === 404) {
        record("error", "logos", `404 ${check.league}/${check.abbr}: ${check.url}`);
      } else if (!res.ok) {
        record("warn", "logos", `${res.status} ${check.league}/${check.abbr}: ${check.url}`);
      } else if (VERBOSE) {
        pass("logos", `${check.league}/${check.abbr} OK`);
      }
    } catch (err) {
      record("warn", "logos", `Fetch failed ${check.league}/${check.abbr}: ${err}`);
    }

    checked += 1;
    if (checked % 20 === 0) await delay(80);
  }

  pass("logos", `HTTP-checked ${checks.length} team logo URLs`);
}

async function auditLiveHttp(urls: string[]): Promise<void> {
  printHeader(`8. Live HTTP smoke (${ORIGIN})`);

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let checked = 0;

  for (const path of urls) {
    const url = `${ORIGIN}${path}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "RefWatch-AuditLinks/1.0" },
        redirect: "follow",
      });
      const body = await res.text();
      if (res.status === 404) {
        record("error", "live", `404 ${path}`);
      } else if (res.status >= 500) {
        record("error", "live", `${res.status} ${path}`);
      } else {
        for (const { label, re } of ERROR_BODY_PATTERNS) {
          if (re.test(body)) {
            record("error", "live", `${label} signature in body: ${path}`);
            break;
          }
        }
        if (VERBOSE) pass("live", `${res.status} ${path}`);
      }
    } catch (err) {
      record("error", "live", `Fetch failed ${path}: ${err}`);
    }
    checked += 1;
    if (checked % 10 === 0) await delay(120);
  }
}

function buildLiveSampleUrls(): string[] {
  const urls = new Set<string>(canonicalSiteRoutePaths());

  urls.add("/compare");
  urls.add("/feed/nba/json");
  urls.add("/feed/nhl/rss");

  for (const league of LEAGUE_CONFIGS) {
    const slugs = league.getRefSlugs();
    if (slugs[0]) urls.add(refProfileHref(league.id, slugs[0]));
    if (slugs[1]) urls.add(refProfileHref(league.id, slugs[1]));
    const team = league.teams[0];
    if (team) urls.add(leagueHref(league.id, `/teams/${team.abbr}`));

    const matrixPath = leagueHref(league.id, "/matrix");
    urls.add(matrixPath);
    urls.add(`${matrixPath}?team=ZZZ&ref=fake-official-0`);
    if (team && slugs[0]) {
      urls.add(`${matrixPath}?team=${team.abbr}&ref=${slugs[0]}`);
    }
  }

  const insightsPath = join(ROOT, "data", "overview-insights.json");
  if (existsSync(insightsPath)) {
    const { cards } = JSON.parse(readFileSync(insightsPath, "utf8")) as {
      cards: LeagueInsightCard[];
    };
    for (const card of cards) {
      for (const link of card.links) {
        if (link.href.startsWith("/")) urls.add(link.href);
      }
    }
  }

  for (const id of getAllResearchFindingIds().slice(0, 6)) {
    const finding = getResearchFindingById(id);
    if (finding) urls.add(researchFindingHref(finding));
  }

  return [...urls].sort();
}

function printSummary(): void {
  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");

  console.log(`\n${c.bold}═══════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}  Ref Watch link audit summary${c.reset}`);
  console.log(`${c.bold}═══════════════════════════════════════${c.reset}`);

  if (errors.length === 0 && warns.length === 0) {
    console.log(`${c.green}${c.bold}  ✓ PASS — no broken paths or missing shards detected${c.reset}`);
    return;
  }

  if (errors.length > 0) {
    console.log(`\n${c.red}${c.bold}  Errors (${errors.length})${c.reset}`);
    for (const f of errors) {
      console.log(`  ${c.red}✗${c.reset} [${f.phase}] ${f.message}`);
    }
  }

  if (warns.length > 0) {
    console.log(`\n${c.yellow}${c.bold}  Warnings (${warns.length})${c.reset}`);
    for (const f of warns) {
      console.log(`  ${c.yellow}!${c.reset} [${f.phase}] ${f.message}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n${c.red}${c.bold}  ✗ FAIL — fix errors before deploy${c.reset}\n`);
  } else {
    console.log(`\n${c.yellow}${c.bold}  ⚠ PASS with warnings${c.reset}\n`);
  }
}

async function main(): Promise<void> {
  console.log(`${c.bold}Ref Watch link & data audit${c.reset}`);
  console.log(`${c.dim}  root: ${ROOT}${c.reset}`);
  console.log(`${c.dim}  mode: ${LIVE ? `live (${ORIGIN})` : "offline"}${c.reset}`);

  auditRouteMap();
  auditShards();
  auditSlugHygiene();
  auditInternalLinks();
  auditMatrixDefensiveness();
  auditLocalLeagueLogos();

  if (LOGOS) {
    await auditRemoteTeamLogos();
  } else {
    console.log(`\n${c.dim}  Tip: run with --logos to HTTP-check team logo URLs${c.reset}`);
  }

  if (LIVE) {
    const urls = buildLiveSampleUrls();
    console.log(`${c.dim}  live sample size: ${urls.length} URLs${c.reset}`);
    await auditLiveHttp(urls);
  } else {
    console.log(`\n${c.dim}  Tip: run with --live to HTTP-check ${ORIGIN}${c.reset}`);
  }

  printSummary();

  const errorCount = findings.filter((f) => f.severity === "error").length;
  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
