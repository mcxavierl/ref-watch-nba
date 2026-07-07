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
