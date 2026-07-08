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
copyPair(path.join(root, "data/nfl"), path.join(root, "public/data/nfl"), "ref-photos");
copyPair(path.join(root, "data/cbb"), path.join(root, "public/data/cbb"), "ref-stats");
copyPair(path.join(root, "data/cfb"), path.join(root, "public/data/cfb"), "ref-stats");
copyPair(path.join(root, "data/epl"), path.join(root, "public/data/epl"), "ref-stats");
copyPair(path.join(root, "data/epl"), path.join(root, "public/data/epl"), "ref-photos");

const nflAssignments = path.join(root, "data/nfl/assignments.json");
if (fs.existsSync(nflAssignments)) {
  const dest = path.join(root, "public/data/nfl/assignments.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(nflAssignments, dest);
  console.log(`Copied ${nflAssignments} → ${dest}`);
}

const cbbAssignments = path.join(root, "data/cbb/assignments.json");
if (fs.existsSync(cbbAssignments)) {
  const dest = path.join(root, "public/data/cbb/assignments.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(cbbAssignments, dest);
  console.log(`Copied ${cbbAssignments} → ${dest}`);
}

const cfbAssignments = path.join(root, "data/cfb/assignments.json");
if (fs.existsSync(cfbAssignments)) {
  const dest = path.join(root, "public/data/cfb/assignments.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(cfbAssignments, dest);
  console.log(`Copied ${cfbAssignments} → ${dest}`);
}

const eplAssignments = path.join(root, "data/epl/assignments.json");
if (fs.existsSync(eplAssignments)) {
  const dest = path.join(root, "public/data/epl/assignments.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(eplAssignments, dest);
  console.log(`Copied ${eplAssignments} → ${dest}`);
}
