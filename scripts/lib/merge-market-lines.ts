#!/usr/bin/env npx tsx
/**
 * Merge market line shards into league game logs (closing total + home spread).
 */
import { mergeMarketLinesForActiveLeagues } from "./lib/game-logs";

mergeMarketLinesForActiveLeagues();
