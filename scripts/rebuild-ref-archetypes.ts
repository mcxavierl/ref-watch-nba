#!/usr/bin/env npx tsx
/**
 * Attach Ref-Intelligence archetype personas to ref profiles from game logs.
 *
 * Usage: npm run rebuild-ref-archetypes
 */
import * as path from "node:path";
import { generateMatrixData } from "./ingest/generate-matrix-data";

export function rebuildRefArchetypes(root?: string): number {
  return generateMatrixData(root);
}

function main(): void {
  console.log("=== Rebuild Ref-Intelligence archetypes ===\n");
  const total = rebuildRefArchetypes();
  console.log(`\nDone. ${total} refs tagged across leagues.`);
}

if (import.meta.url.startsWith("file:")) {
  const executed = path.resolve(process.argv[1] ?? "");
  const modulePath = path.resolve(new URL(import.meta.url).pathname);
  if (executed === modulePath) {
    main();
  }
}
