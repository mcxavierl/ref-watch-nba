import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type ColorDriftViolation = {
  rule: string;
  file: string;
  line: number;
  excerpt: string;
};

/** Paths where raw hex and league accents are expected. */
export const HEX_ALLOWLIST_PREFIXES = [
  "figma/",
  "public/",
  "src/app/globals.css",
  "src/components/RefAvatar.tsx",
  "src/components/insight-card.css",
  "src/components/og-components/",
  "src/components/overview-clinical-modern.css",
  "src/components/overview-dashboard.css",
  "src/components/site-delight.css",
  "src/components/worldcup/worldcup-delight.css",
  "src/lib/b2b-widgets.ts",
  "src/lib/brand-colors.ts",
  "src/lib/og-brand.ts",
  "src/lib/og-hero.ts",
  "src/lib/og-image.tsx",
  "src/styles/",
];

/** Deprecated prestige champagne — keep on OG/social and token sources only. */
export const CHAMPAGNE_GOLD_ALLOWLIST_PREFIXES = [
  ...HEX_ALLOWLIST_PREFIXES,
  "src/lib/og-image.test.ts",
  "src/lib/clinical-modern-surfaces.test.ts",
  "src/lib/design-audit.test.ts",
  "scripts/audit-color-drift.test.ts",
];

export const CLINICAL_SURFACE_MARKERS = [
  /wc-data-capsule/,
  /ref-card/,
  /clinical-card/,
  /CLINICAL_CARD_CLASS/,
  /REF_CARD_CLASS/,
] as const;

export const BANNED_TAILWIND_IN_CLINICAL = [
  /\btext-slate-600\b/,
  /\btext-slate-700\b/,
  /\btext-zinc-600\b/,
  /\btext-gray-600\b/,
] as const;

const SCAN_ROOTS = ["src/components", "src/app"] as const;
const SCAN_EXTENSIONS = new Set([".ts", ".tsx"]);

const HEX_LITERAL = /#[0-9a-fA-F]{3,8}\b/g;
const ARBITRARY_HEX_CLASS = /(?:bg|text|border|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g;
const CHAMPAGNE_GOLD = /#bfa86a\b/i;

function stripVarFallbackHex(line: string): string {
  return line.replace(/var\([^)]*,\s*#[0-9a-fA-F]{3,8}\s*\)/gi, "var(--token-fallback)");
}

function isAllowlisted(relPath: string, allowlist: readonly string[]): boolean {
  return allowlist.some(
    (prefix) => relPath === prefix || relPath.startsWith(prefix),
  );
}

function isTestFile(relPath: string): boolean {
  return relPath.endsWith(".test.ts") || relPath.endsWith(".test.tsx");
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

export function listColorDriftTargets(root: string): string[] {
  const files: string[] = [];
  for (const scanRoot of SCAN_ROOTS) {
    const abs = join(root, scanRoot);
    walkFiles(root, abs, files);
  }
  return files.sort();
}

function walkCssFiles(root: string, dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      walkCssFiles(root, abs, out);
      continue;
    }
    if (!entry.endsWith(".css")) continue;
    out.push(relative(root, abs));
  }
}

export function listCssColorDriftTargets(root: string): string[] {
  const files: string[] = [];
  for (const scanRoot of SCAN_ROOTS) {
    walkCssFiles(root, join(root, scanRoot), files);
  }
  return files.sort();
}

export function isClinicalSurfaceSource(content: string): boolean {
  return CLINICAL_SURFACE_MARKERS.some((marker) => marker.test(content));
}

function lineExcerpt(line: string): string {
  return line.trim().slice(0, 140);
}

export function scanClinicalTailwindDrift(
  relPath: string,
  content: string,
): ColorDriftViolation[] {
  if (!relPath.endsWith(".tsx") && !relPath.endsWith(".ts")) return [];
  if (!isClinicalSurfaceSource(content)) return [];

  const violations: ColorDriftViolation[] = [];
  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const pattern of BANNED_TAILWIND_IN_CLINICAL) {
      if (!pattern.test(line)) continue;
      violations.push({
        rule: "clinical-tailwind-drift",
        file: relPath,
        line: index + 1,
        excerpt: lineExcerpt(line),
      });
    }
  }

  return violations;
}

export function scanHardcodedHexDrift(
  relPath: string,
  content: string,
): ColorDriftViolation[] {
  if (isAllowlisted(relPath, HEX_ALLOWLIST_PREFIXES)) return [];
  if (isTestFile(relPath)) return [];

  const violations: ColorDriftViolation[] = [];
  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const sanitized = stripVarFallbackHex(line);
    const matches = [
      ...sanitized.matchAll(HEX_LITERAL),
      ...sanitized.matchAll(ARBITRARY_HEX_CLASS),
    ];
    if (matches.length === 0) continue;

    violations.push({
      rule: "hardcoded-hex",
      file: relPath,
      line: index + 1,
      excerpt: lineExcerpt(line),
    });
  }

  return violations;
}

export function scanChampagneGoldDrift(
  relPath: string,
  content: string,
): ColorDriftViolation[] {
  if (isAllowlisted(relPath, CHAMPAGNE_GOLD_ALLOWLIST_PREFIXES)) return [];
  if (isTestFile(relPath) && !relPath.includes("audit-color-drift")) return [];
  if (!relPath.endsWith(".css") && !relPath.endsWith(".tsx") && !relPath.endsWith(".ts")) {
    return [];
  }

  const violations: ColorDriftViolation[] = [];
  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!CHAMPAGNE_GOLD.test(line)) continue;
    violations.push({
      rule: "deprecated-champagne-gold",
      file: relPath,
      line: index + 1,
      excerpt: lineExcerpt(line),
    });
  }

  return violations;
}

export function scanColorDriftFile(
  root: string,
  relPath: string,
): ColorDriftViolation[] {
  const content = readFileSync(join(root, relPath), "utf8");
  return [
    ...scanClinicalTailwindDrift(relPath, content),
    ...scanHardcodedHexDrift(relPath, content),
    ...scanChampagneGoldDrift(relPath, content),
  ];
}

export function scanColorDrift(root: string): ColorDriftViolation[] {
  const violations: ColorDriftViolation[] = [];
  for (const relPath of listColorDriftTargets(root)) {
    violations.push(...scanColorDriftFile(root, relPath));
  }
  for (const relPath of listCssColorDriftTargets(root)) {
    const content = readFileSync(join(root, relPath), "utf8");
    violations.push(...scanChampagneGoldDrift(relPath, content));
  }
  return violations;
}
