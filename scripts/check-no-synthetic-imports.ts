#!/usr/bin/env npx tsx
/**
 * Fails CI if production code imports synthetic/deprecated data paths.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

const FORBIDDEN_PATTERNS = [
  /comprehensive-seed/,
  /generate-comprehensive-seed/,
  /generate-ref-seed/,
  /data\/deprecated\//,
  /data\/game-logs\.json/,
  /ref-stats\.seed\.json/,
  /game-logs\.seed\.json/,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const violations: { file: string; pattern: string; line: number }[] = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file);
  if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;

  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: rel,
          pattern: pattern.source,
          line: i + 1,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Synthetic import check FAILED:\n");
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} matches /${v.pattern}/`);
  }
  process.exit(1);
}

console.log(`Synthetic import check passed (${walk(SRC).length} src files scanned).`);
