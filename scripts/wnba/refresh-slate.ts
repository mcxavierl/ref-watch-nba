#!/usr/bin/env npx tsx
/**
 * Lightweight WNBA in-season refresh: official assignments + public mirror + overview snapshot.
 * Run on a few-times-daily schedule while crews publish on official.nba.com.
 */
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export function copyWnbaAssignmentsToPublic(root = process.cwd()): void {
  const src = path.join(root, "data/wnba/assignments.json");
  const dest = path.join(root, "public/data/wnba/assignments.json");
  if (!fs.existsSync(src)) {
    throw new Error(`Missing ${src}. Run fetch-wnba-assignments first.`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Copied ${src} → ${dest}`);
}

function main(): void {
  const root = process.cwd();
  console.log("WNBA slate refresh (assignments + overview snapshot)");
  execSync("npm run fetch-wnba-assignments", { stdio: "inherit", cwd: root });
  copyWnbaAssignmentsToPublic(root);
  execSync("npx tsx scripts/build-overview-snapshot.ts", { stdio: "inherit", cwd: root });
  console.log("WNBA slate refresh complete.");
}

if (import.meta.url.startsWith("file:")) {
  const executed = path.resolve(process.argv[1] ?? "");
  const modulePath = path.resolve(new URL(import.meta.url).pathname);
  if (executed === modulePath) {
    main();
  }
}
