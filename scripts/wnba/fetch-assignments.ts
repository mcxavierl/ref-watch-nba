#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { fetchWnbaAssignments } from "../lib/parse-assignments";

const outPath = path.join(process.cwd(), "data", "wnba", "assignments.json");

async function main() {
  console.log("Fetching WNBA referee assignments...");
  const data = await fetchWnbaAssignments();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(
    `Wrote ${data.games.length} WNBA game(s) to ${outPath} (${data.date})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
