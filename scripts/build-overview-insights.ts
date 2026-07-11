#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { buildLeagueInsightCards } from "../src/lib/league-overview-insights";

const root = process.cwd();
const dest = path.join(root, "data", "overview-insights.json");

const cards = buildLeagueInsightCards();
const payload = {
  generatedAt: new Date().toISOString(),
  cards,
};

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, `${JSON.stringify(payload)}\n`);
console.log(`Wrote ${dest} (${cards.length} league insights)`);
