#!/usr/bin/env npx tsx
/**
 * Guardrail: tests that import generated JSON must not pin specific entities.
 * Rebuilding overview-insights.json (or other build artifacts) changes which
 * refs/teams surface on the homepage — hardcoded slugs break CI silently until deploy.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = process.cwd();

/** Generated artifacts whose contents change when build scripts re-run. */
const GENERATED_IMPORTS = [
  "overview-insights.json",
  "overview-snapshot.json",
  "overview-drilldowns.json",
];

/** Match hardcoded entity pins inside tests (refSlug, entityName, drilldownId, etc.). */
const PINNED_ENTITY =
  /\.(?:find|some|filter)\([^)]*(?:refSlug|entityName|drilldownId|teamAbbr)\s*===\s*["'][^"']+["']/;

const failures: string[] = [];

function walkTests(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".open-next") {
        continue;
      }
      walkTests(full, out);
      continue;
    }
    if (entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
}

function rel(filePath: string): string {
  return path.relative(ROOT, filePath);
}

function checkTestFile(filePath: string): void {
  const source = fs.readFileSync(filePath, "utf8");
  const importsGenerated = GENERATED_IMPORTS.some((artifact) =>
    source.includes(artifact),
  );
  if (!importsGenerated) return;

  if (PINNED_ENTITY.test(source)) {
    failures.push(
      `${rel(filePath)}: imports generated JSON but pins a specific refSlug/entity — select cards by league/kind instead`,
    );
  }
}

const testFiles: string[] = [];
for (const dir of ["src", "scripts"]) {
  const abs = path.join(ROOT, dir);
  if (fs.existsSync(abs)) walkTests(abs, testFiles);
}

for (const file of testFiles) {
  checkTestFile(file);
}

if (failures.length > 0) {
  console.error("check-generated-artifact-tests FAILED:\n");
  for (const msg of failures) {
    console.error(`  ✗ ${msg}`);
  }
  console.error(
    `\n${failures.length} issue(s). Use inline fixtures or select by league/kind, not pinned slugs.`,
  );
  process.exit(1);
}

console.log(
  `check-generated-artifact-tests: OK (${testFiles.length} test files scanned)`,
);
