#!/usr/bin/env npx tsx
/** @deprecated Use scripts/cfb/build-cfb-data.ts — kept for npm script compatibility. */
import { main } from "./build-cfb-data";

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
