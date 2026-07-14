#!/usr/bin/env npx tsx
/**
 * CFB data build — SEC verified sample until full ESPN backfill is ready.
 * Avoids hammering ESPN during offseason; run scripts/cbb/build-ref-data.ts separately for CBB.
 */
import { main as buildSecSample } from "./build-sec-verified-sample";

buildSecSample();
