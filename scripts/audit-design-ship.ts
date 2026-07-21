#!/usr/bin/env npx tsx
/**
 * Design ship gate — bundles the three priority design audits:
 * 1. Theme matrix screenshots (light / dark / high-contrast)
 * 2. Color drift scanner (raw slate / hex outside token files)
 * 3. Brand surface test (header, OG, accent-brand, league logos)
 *
 * Prerequisites (CI runs these before this script):
 *   npm run build:next
 *   npx playwright install --with-deps chromium
 *
 * Usage: npm run audit:design-ship
 */
import { spawnSync } from "node:child_process";

const STEPS: Array<{ label: string; command: string; args: string[] }> = [
  { label: "Theme matrix contrast", command: "npm", args: ["run", "audit:theme-matrix"] },
  { label: "Mobile viewport layout", command: "npm", args: ["run", "audit:mobile-layout"] },
  { label: "Color drift", command: "npm", args: ["run", "audit:color-drift"] },
  { label: "Brand surfaces", command: "npm", args: ["run", "audit:brand-surfaces"] },
];

function main(): void {
  console.log("Design ship audit — theme matrix, color drift, brand surfaces\n");

  for (const step of STEPS) {
    console.log(`→ ${step.label}`);
    const result = spawnSync(step.command, step.args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });
    if (result.status !== 0) {
      console.error(`\nDesign ship audit failed at: ${step.label}`);
      process.exit(result.status ?? 1);
    }
    console.log("");
  }

  console.log("Design ship audit passed (theme matrix + color drift + brand surfaces).");
}

main();
