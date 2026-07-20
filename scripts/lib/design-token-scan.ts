import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type DesignTokenViolation = {
  rule: string;
  file: string;
  line: number;
  excerpt: string;
};

/** Canonical CSS files that may define guarded design tokens. */
export const TOKEN_SOURCE_FILES = [
  "src/styles/theme-tokens.css",
  "src/styles/clinical-doc-tokens.css",
  "src/app/globals.css",
  "src/components/worldcup/worldcup-delight.css",
] as const;

/** World Cup tokens must be declared in one of these files. */
export const WC_CANONICAL_FILES = [
  "src/app/globals.css",
  "src/components/worldcup/worldcup-delight.css",
] as const;

export const GUARDED_PREFIXES = [
  "--clinical-",
  "--methodology-",
  "--accent-",
  "--wc-",
] as const;

const FIGMA_CSS_SEMANTIC_MAP: Record<string, string> = {
  positive: "--semantic-positive",
  negative: "--semantic-negative",
  caution: "--semantic-caution",
};

const SCAN_CSS_ROOTS = ["src/components", "src/app", "src/styles"] as const;
const SCAN_TS_ROOTS = ["src/components", "src/app"] as const;

const VAR_REF_RE = /var\(\s*--([a-z0-9-]+)/gi;
const VAR_DEF_RE = /--([a-z0-9-]+)\s*:/g;
const HEX_RE = /^#([0-9a-f]{3,8})$/i;

function normalizeHex(hex: string): string {
  const match = hex.match(HEX_RE);
  if (!match) return hex.toLowerCase();
  let value = match[1]!.toLowerCase();
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return `#${value}`;
}

export function isGuardedToken(name: string): boolean {
  return GUARDED_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function extractVarDefinitions(content: string): Set<string> {
  const definitions = new Set<string>();
  for (const match of content.matchAll(VAR_DEF_RE)) {
    definitions.add(`--${match[1]}`);
  }
  return definitions;
}

export function extractVarReferences(content: string): Set<string> {
  const references = new Set<string>();
  for (const match of content.matchAll(VAR_REF_RE)) {
    references.add(`--${match[1]}`);
  }
  return references;
}

function walkFiles(
  root: string,
  dir: string,
  extensions: Set<string>,
  out: string[],
): void {
  if (!existsSync(dir)) return;

  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walkFiles(root, abs, extensions, out);
      continue;
    }

    const ext = entry.slice(entry.lastIndexOf("."));
    if (!extensions.has(ext)) continue;
    out.push(relative(root, abs));
  }
}

export function listScanCssFiles(root: string): string[] {
  const files: string[] = [];
  const extensions = new Set([".css"]);
  for (const scanRoot of SCAN_CSS_ROOTS) {
    walkFiles(root, join(root, scanRoot), extensions, files);
  }
  return files.sort();
}

export function listScanTsFiles(root: string): string[] {
  const files: string[] = [];
  const extensions = new Set([".ts", ".tsx"]);
  for (const scanRoot of SCAN_TS_ROOTS) {
    walkFiles(root, join(root, scanRoot), extensions, files);
  }
  return files
    .filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
    .sort();
}

export function collectDefinitionsFromSources(root: string): Set<string> {
  const definitions = new Set<string>();
  for (const relPath of TOKEN_SOURCE_FILES) {
    const abs = join(root, relPath);
    if (!existsSync(abs)) continue;
    for (const name of extractVarDefinitions(readFileSync(abs, "utf8"))) {
      definitions.add(name);
    }
  }
  return definitions;
}

export function scanGuardedTokenReferences(
  relPath: string,
  content: string,
  definedTokens: Set<string>,
): DesignTokenViolation[] {
  const violations: DesignTokenViolation[] = [];
  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    for (const match of line.matchAll(VAR_REF_RE)) {
      const token = `--${match[1]}`;
      if (!isGuardedToken(token)) continue;
      if (definedTokens.has(token)) continue;

      violations.push({
        rule: "guarded-token-undefined",
        file: relPath,
        line: index + 1,
        excerpt: line.trim().slice(0, 120),
      });
    }
  }

  return violations;
}

export function scanFigmaTokenParity(
  root: string,
  definedTokens: Set<string>,
): DesignTokenViolation[] {
  const figmaPath = join(root, "figma/design-tokens.json");
  if (!existsSync(figmaPath)) return [];

  const figma = JSON.parse(readFileSync(figmaPath, "utf8")) as {
    clinicalModern?: {
      typography?: Record<string, string>;
      semantic?: Record<string, string>;
    };
  };

  const globalsPath = join(root, "src/app/globals.css");
  const globalsContent = existsSync(globalsPath)
    ? readFileSync(globalsPath, "utf8")
    : "";

  const semanticHexFromCss = new Map<string, string>();
  for (const cssVar of Object.values(FIGMA_CSS_SEMANTIC_MAP)) {
    const escaped = cssVar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = globalsContent.match(
      new RegExp(`${escaped}\\s*:\\s*(#[0-9a-fA-F]{3,8})`),
    );
    if (match?.[1]) {
      semanticHexFromCss.set(cssVar, normalizeHex(match[1]));
    }
  }

  const violations: DesignTokenViolation[] = [];

  const checkVarRefs = (label: string, value: string) => {
    if (!value.includes("var(")) return;
    for (const ref of extractVarReferences(value)) {
      if (definedTokens.has(ref)) continue;
      violations.push({
        rule: "figma-token-drift",
        file: "figma/design-tokens.json",
        line: 0,
        excerpt: `${label} references undefined ${ref}`,
      });
    }
  };

  for (const [key, value] of Object.entries(figma.clinicalModern?.semantic ?? {})) {
    checkVarRefs(`semantic.${key}`, value);

    const cssVar = FIGMA_CSS_SEMANTIC_MAP[key];
    if (!cssVar || !value.startsWith("#")) continue;

    const cssHex = semanticHexFromCss.get(cssVar);
    if (!cssHex || normalizeHex(value) !== cssHex) {
      violations.push({
        rule: "figma-semantic-drift",
        file: "figma/design-tokens.json",
        line: 0,
        excerpt: `semantic.${key} ${value} does not match ${cssVar} (${cssHex ?? "missing"})`,
      });
    }
  }

  for (const [key, value] of Object.entries(figma.clinicalModern?.typography ?? {})) {
    checkVarRefs(`typography.${key}`, value);
  }

  return violations;
}

export function scanWcTokenOrphans(
  root: string,
  cssFiles: string[],
): DesignTokenViolation[] {
  const violations: DesignTokenViolation[] = [];
  const wcDefinitionsByFile = new Map<string, Set<string>>();
  const canonicalFiles = new Set<string>(WC_CANONICAL_FILES);

  for (const relPath of cssFiles) {
    const wcTokens = new Set<string>();
    for (const name of extractVarDefinitions(readFileSync(join(root, relPath), "utf8"))) {
      if (name.startsWith("--wc-")) wcTokens.add(name);
    }
    if (wcTokens.size > 0) wcDefinitionsByFile.set(relPath, wcTokens);
  }

  for (const [file, tokens] of wcDefinitionsByFile) {
    if (canonicalFiles.has(file)) continue;
    for (const token of tokens) {
      violations.push({
        rule: "wc-token-orphan",
        file,
        line: 0,
        excerpt: `${token} defined outside globals.css / worldcup-delight.css`,
      });
    }
  }

  for (const [file, tokens] of wcDefinitionsByFile) {
    if (file === "src/components/worldcup/worldcup-delight.css") continue;
    for (const token of tokens) {
      if (!token.startsWith("--wc-capsule")) continue;
      violations.push({
        rule: "wc-capsule-misplaced",
        file,
        line: 0,
        excerpt: `${token} should be defined in worldcup-delight.css`,
      });
    }
  }

  return violations;
}

export function scanDesignTokenParity(root: string): DesignTokenViolation[] {
  const definedTokens = collectDefinitionsFromSources(root);
  const violations: DesignTokenViolation[] = [];
  const cssFiles = listScanCssFiles(root);
  const tsFiles = listScanTsFiles(root);

  for (const relPath of cssFiles) {
    violations.push(
      ...scanGuardedTokenReferences(
        relPath,
        readFileSync(join(root, relPath), "utf8"),
        definedTokens,
      ),
    );
  }

  for (const relPath of tsFiles) {
    violations.push(
      ...scanGuardedTokenReferences(
        relPath,
        readFileSync(join(root, relPath), "utf8"),
        definedTokens,
      ),
    );
  }

  violations.push(...scanFigmaTokenParity(root, definedTokens));
  violations.push(...scanWcTokenOrphans(root, cssFiles));

  return violations;
}
