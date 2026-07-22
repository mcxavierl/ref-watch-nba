#!/usr/bin/env npx tsx
/**
 * Highlight signal integrity audit — verifies materiality gates and unique
 * superlative badges across every verified live league rankings grid.
 *
 * Usage: npm run audit:highlight-integrity
 */
import { auditHighlightIntegrityForLiveLeagues } from "@/lib/highlight-integrity-audit";

function main(): void {
  const results = auditHighlightIntegrityForLiveLeagues();
  const failures: string[] = [];

  for (const result of results) {
    if (result.insightCount === 0) {
      console.log(`  ○ ${result.leagueId}: no qualified officials (skipped)`);
      continue;
    }

    if (result.failures.length === 0) {
      console.log(
        `  ✓ ${result.leagueId}: ${result.insightCount} highlight card(s), gates OK`,
      );
      continue;
    }

    console.error(`  ✗ ${result.leagueId}: ${result.failures.length} issue(s)`);
    for (const failure of result.failures) {
      console.error(`      - ${failure}`);
      failures.push(failure);
    }
  }

  if (failures.length > 0) {
    console.error(
      `\nHighlight integrity audit failed (${failures.length} issue(s)).`,
    );
    process.exit(1);
  }

  console.log(
    `\nHighlight integrity audit passed (${results.length} live leagues).`,
  );
}

main();
