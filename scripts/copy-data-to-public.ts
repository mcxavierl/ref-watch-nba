#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";

function copyPair(srcDir: string, destDir: string, basename: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of [`${basename}.json`, `${basename}.seed.json`]) {
    const src = path.join(srcDir, file);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(destDir, file));
    console.log(`Copied ${src} → ${path.join(destDir, file)}`);
  }
}

const root = process.cwd();
copyPair(path.join(root, "data"), path.join(root, "public/data/nba"), "ref-stats");
copyPair(path.join(root, "data/nhl"), path.join(root, "public/data/nhl"), "ref-stats");
copyPair(path.join(root, "data/nhl"), path.join(root, "public/data/nhl"), "ref-photos");
copyPair(path.join(root, "data/nfl"), path.join(root, "public/data/nfl"), "ref-stats");

const nflAssignments = path.join(root, "data/nfl/assignments.json");
if (fs.existsSync(nflAssignments)) {
  const dest = path.join(root, "public/data/nfl/assignments.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(nflAssignments, dest);
  console.log(`Copied ${nflAssignments} → ${dest}`);
}
