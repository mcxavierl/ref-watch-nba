#!/usr/bin/env npx tsx
/** @deprecated Use scripts/cfb/build-ref-data.ts — kept for npm script compatibility. */
import { main } from "./build-ref-data";

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
