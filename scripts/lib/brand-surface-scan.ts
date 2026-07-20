import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type BrandSurfaceViolation = {
  rule: string;
  file: string;
  line?: number;
  excerpt?: string;
  message: string;
};

/** Canonical OG / league accent hex values — must not be duplicated outside allowlists. */
export const OG_LEAGUE_ACCENT_HEX = [
  "#ef3b55",
  "#4d9fff",
  "#34d399",
  "#a78bfa",
  "#fb923c",
  "#009cde",
] as const;

export const OG_ACCENT_ALLOWLIST_PREFIXES = [
  "src/lib/og-brand.ts",
  "src/lib/brand-colors.ts",
  "src/app/globals.css",
  "src/styles/theme-tokens.css",
  "src/lib/og-image.tsx",
  "src/components/og-components/",
  "figma/",
  "scripts/lib/brand-surface-scan.ts",
  "scripts/audit-brand-surfaces.test.ts",
] as const;

export const LEAGUE_LOGO_PATH_ALLOWLIST_PREFIXES = [
  "src/lib/league-logo-src.ts",
  "src/components/LeagueSwitchMark.tsx",
  "src/config/leagueConfig.ts",
  "scripts/lib/brand-surface-scan.ts",
  "scripts/audit-brand-surfaces.test.ts",
] as const;

const SCAN_ROOTS = ["src/components", "src/app", "src/lib"] as const;
const SCAN_EXTENSIONS = new Set([".ts", ".tsx"]);

const LOGO_PATH_PATTERN = /\/logos\/[a-z0-9-]+\.(?:svg|png)/gi;

function read(root: string, relPath: string): string {
  return readFileSync(join(root, relPath), "utf8");
}

function isAllowlisted(relPath: string, allowlist: readonly string[]): boolean {
  return allowlist.some((prefix) => relPath === prefix || relPath.startsWith(prefix));
}

function lineExcerpt(line: string): string {
  return line.trim().slice(0, 140);
}

function walkFiles(root: string, dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      walkFiles(root, abs, out);
      continue;
    }
    const ext = entry.slice(entry.lastIndexOf("."));
    if (!SCAN_EXTENSIONS.has(ext)) continue;
    out.push(relative(root, abs));
  }
}

export function listBrandSurfaceTargets(root: string): string[] {
  const files: string[] = [];
  for (const scanRoot of SCAN_ROOTS) {
    walkFiles(root, join(root, scanRoot), files);
  }
  return files.sort();
}

function pushContractViolation(
  violations: BrandSurfaceViolation[],
  rule: string,
  file: string,
  message: string,
): void {
  violations.push({ rule, file, message });
}

export function scanStructuralBrandContracts(root: string): BrandSurfaceViolation[] {
  const violations: BrandSurfaceViolation[] = [];

  const header = read(root, "src/components/SiteHeader.tsx");
  if (!/site-header-brand/.test(header)) {
    pushContractViolation(
      violations,
      "header-structure",
      "src/components/SiteHeader.tsx",
      "SiteHeader must use site-header-brand",
    );
  }
  if (!/site-header-mark/.test(header)) {
    pushContractViolation(
      violations,
      "header-structure",
      "src/components/SiteHeader.tsx",
      "SiteHeader must use site-header-mark",
    );
  }
  if (!/LeagueNav/.test(header)) {
    pushContractViolation(
      violations,
      "header-structure",
      "src/components/SiteHeader.tsx",
      "SiteHeader must render LeagueNav in site-header-league",
    );
  }
  if (/\b(?:text|bg|border|ring)-slate-/.test(header)) {
    pushContractViolation(
      violations,
      "header-slate-drift",
      "src/components/SiteHeader.tsx",
      "SiteHeader must not use raw slate Tailwind utilities",
    );
  }

  const globals = read(root, "src/app/globals.css");
  if (!/--accent-brand:/.test(read(root, "src/styles/theme-tokens.css"))) {
    pushContractViolation(
      violations,
      "accent-brand-token",
      "src/styles/theme-tokens.css",
      "theme-tokens.css must define --accent-brand",
    );
  }
  if (!/--color-accent-brand:\s*var\(--accent-brand\)/.test(globals)) {
    pushContractViolation(
      violations,
      "accent-brand-token",
      "src/app/globals.css",
      "globals.css must map --color-accent-brand to var(--accent-brand)",
    );
  }
  if (!/\.site-header-mark-icon[\s\S]*var\(--header-gold\)/.test(globals)) {
    pushContractViolation(
      violations,
      "accent-brand-token",
      "src/app/globals.css",
      "globals.css must style site-header-mark-icon with var(--header-gold)",
    );
  }

  const ogBrand = read(root, "src/lib/og-brand.ts");
  if (!/export const OG_LEAGUE_ACCENTS/.test(ogBrand)) {
    pushContractViolation(
      violations,
      "og-accent-source",
      "src/lib/og-brand.ts",
      "og-brand.ts must export OG_LEAGUE_ACCENTS",
    );
  }

  const ogImage = read(root, "src/lib/og-image.tsx");
  if (!/from "@\/lib\/og-brand"/.test(ogImage)) {
    pushContractViolation(
      violations,
      "og-accent-source",
      "src/lib/og-image.tsx",
      "og-image.tsx must import accents from og-brand",
    );
  }
  if (!/from "@\/components\/og-components\/HeroView"/.test(ogImage)) {
    pushContractViolation(
      violations,
      "og-accent-source",
      "src/lib/og-image.tsx",
      "og-image.tsx must render HeroView from og-components",
    );
  }

  const heroLogo = read(root, "src/components/LeagueHeroLogo.tsx");
  if (!/leagueLogoSrc/.test(heroLogo) || !/league-hero-logo/.test(heroLogo)) {
    pushContractViolation(
      violations,
      "league-logo-component",
      "src/components/LeagueHeroLogo.tsx",
      "LeagueHeroLogo must use leagueLogoSrc and league-hero-logo classes",
    );
  }

  const navMark = read(root, "src/components/LeagueSwitchMark.tsx");
  if (!/leagueLogoSrc/.test(navMark) || !/league-nav-mark/.test(navMark)) {
    pushContractViolation(
      violations,
      "league-logo-component",
      "src/components/LeagueSwitchMark.tsx",
      "LeagueNavMark must use leagueLogoSrc and league-nav-mark classes",
    );
  }

  const themeMatrix = read(root, "scripts/lib/theme-matrix-config.ts");
  for (const page of ["homepage", "nba-hub", "theme-matrix-fixture"]) {
    if (!new RegExp(`name: "${page}"`).test(themeMatrix)) {
      pushContractViolation(
        violations,
        "theme-matrix-coverage",
        "scripts/lib/theme-matrix-config.ts",
        `theme matrix must include ${page} screenshots`,
      );
    }
  }

  return violations;
}

export function scanOgAccentDrift(
  relPath: string,
  content: string,
): BrandSurfaceViolation[] {
  if (isAllowlisted(relPath, OG_ACCENT_ALLOWLIST_PREFIXES)) return [];
  if (relPath.endsWith(".test.ts") || relPath.endsWith(".test.tsx")) return [];

  const violations: BrandSurfaceViolation[] = [];
  const lower = content.toLowerCase();
  const lines = content.split("\n");

  for (const hex of OG_LEAGUE_ACCENT_HEX) {
    if (!lower.includes(hex)) continue;
    const lineIndex = lines.findIndex((line) => line.toLowerCase().includes(hex));
    violations.push({
      rule: "og-accent-drift",
      file: relPath,
      line: lineIndex >= 0 ? lineIndex + 1 : undefined,
      excerpt: lineIndex >= 0 ? lineExcerpt(lines[lineIndex]) : undefined,
      message: `League accent ${hex} must be defined in og-brand.ts, not ${relPath}`,
    });
  }

  return violations;
}

export function scanLeagueLogoPathDrift(
  relPath: string,
  content: string,
): BrandSurfaceViolation[] {
  if (isAllowlisted(relPath, LEAGUE_LOGO_PATH_ALLOWLIST_PREFIXES)) return [];
  if (relPath.endsWith(".test.ts") || relPath.endsWith(".test.tsx")) return [];

  const violations: BrandSurfaceViolation[] = [];
  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const matches = line.match(LOGO_PATH_PATTERN);
    if (!matches) continue;
    violations.push({
      rule: "league-logo-path-drift",
      file: relPath,
      line: index + 1,
      excerpt: lineExcerpt(line),
      message: `League logo paths must be centralized in league-logo-src.ts (${matches[0]})`,
    });
  }

  return violations;
}

export function scanBrandSurfaceFile(
  root: string,
  relPath: string,
): BrandSurfaceViolation[] {
  const content = readFileSync(join(root, relPath), "utf8");
  return [
    ...scanOgAccentDrift(relPath, content),
    ...scanLeagueLogoPathDrift(relPath, content),
  ];
}

export function scanBrandSurfaces(root: string): BrandSurfaceViolation[] {
  const violations = scanStructuralBrandContracts(root);
  for (const relPath of listBrandSurfaceTargets(root)) {
    violations.push(...scanBrandSurfaceFile(root, relPath));
  }
  return violations;
}
