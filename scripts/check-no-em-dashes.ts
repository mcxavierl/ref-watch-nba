#!/usr/bin/env npx tsx
/**
 * Fails CI when em dashes (—) appear in user-facing site copy.
 * Hyphens (-) are fine; em dashes are not allowed on refwatch.ca.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = process.cwd();
const EM_DASH = "\u2014";

const SCAN_DIRS = [
  path.join(ROOT, "src", "app"),
  path.join(ROOT, "src", "components"),
  path.join(ROOT, "src", "lib"),
  path.join(ROOT, "data"),
  path.join(ROOT, "public", "data"),
];

const SKIP_FILE_RE =
  /\.(test|spec)\.(ts|tsx)$|\.generated\.(ts|tsx)$|node_modules|\.next/;

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (/\.(tsx|ts|json)$/.test(entry.name) && !SKIP_FILE_RE.test(full)) {
      out.push(full);
    }
  }
  return out;
}

function isCommentOnlyLine(line: string, ext: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (ext === ".tsx" && trimmed.startsWith("{/*")) return true;
  if (trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("*") || trimmed.startsWith("/**") || trimmed.startsWith("*/")) {
    return true;
  }
  return false;
}

type Violation = { file: string; line: number; text: string };

const violations: Violation[] = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    const ext = path.extname(file);
    const rel = path.relative(ROOT, file);
    if (ext === ".css") continue;

    const lines = fs.readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (!line.includes(EM_DASH)) continue;
      if (isCommentOnlyLine(line, ext)) continue;
      violations.push({ file: rel, line: i + 1, text: line.trim() });
    }
  }
}

if (violations.length > 0) {
  console.error(`Em dash (—) found in ${violations.length} location(s). Use hyphens (-) instead.\n`);
  for (const v of violations.slice(0, 40)) {
    console.error(`  ${v.file}:${v.line}: ${v.text}`);
  }
  if (violations.length > 40) {
    console.error(`  … and ${violations.length - 40} more`);
  }
  process.exit(1);
}

console.log("check-no-em-dashes: OK");
