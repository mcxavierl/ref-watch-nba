#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { fetchAssignments } from "./lib/parse-assignments";
import { postAssignmentIngest } from "./lib/post-assignment-ingest";

const outPath = path.join(process.cwd(), "data", "assignments.json");

async function main() {
  console.log("Fetching tonight's referee assignments...");
  const data = await fetchAssignments();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(
    `Wrote ${data.games.length} NBA game(s) to ${outPath} (${data.date})`,
  );
  await postAssignmentIngest("nba", data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
