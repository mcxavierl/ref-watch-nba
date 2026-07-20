#!/usr/bin/env npx tsx
/**
 * Fails CI when unresolved git merge conflict markers are committed.
 * Catches the exact failure that broke main after PR #250 merged.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = process.cwd();

const SCAN_DIRS = [
  path.join(ROOT, "src"),
  path.join(ROOT, "scripts"),
  path.join(ROOT, "data"),
  path.join(ROOT, ".github"),
  path.join(ROOT, "public"),
];

const SCAN_ROOT_FILES = [
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  "next.config.mjs",
];

const SKIP_DIR_RE = /node_modules|\.next|dist|build|coverage/;
const SCAN_FILE_RE = /\.(tsx?|jsx?|json|css|md|ya?ml|mjs|cjs)$/;

const MARKERS = ["<<<<<<<", ">>>>>>>"] as const;

function lineHasConflictMarker(line: string): string | null {
  const trimmed = line.trimStart();
  for (const marker of MARKERS) {
    if (trimmed.startsWith(marker)) return marker;
  }
  return null;
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_RE.test(entry.name)) continue;
      walk(full, out);
    } else if (SCAN_FILE_RE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

type Violation = { file: string; line: number; marker: string; text: string };

const violations: Violation[] = [];

const files = new Set<string>();
for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    files.add(file);
  }
}
for (const rel of SCAN_ROOT_FILES) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) files.add(full);
}

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const marker = lineHasConflictMarker(line);
    if (!marker) continue;
    violations.push({ file: rel, line: i + 1, marker, text: line.trim() });
  }
}

if (violations.length > 0) {
  console.error(
    `Unresolved merge conflict markers found in ${violations.length} location(s).\n`,
  );
  for (const v of violations.slice(0, 40)) {
    console.error(`  ${v.file}:${v.line}: ${v.marker} ${v.text}`);
  }
  if (violations.length > 40) {
    console.error(`  … and ${violations.length - 40} more`);
  }
  console.error(
    "\nResolve conflicts, remove <<<<<<< / >>>>>>> lines, then commit again.",
  );
  process.exit(1);
}

console.log("check-no-conflict-markers: OK");
