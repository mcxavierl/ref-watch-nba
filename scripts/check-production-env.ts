#!/usr/bin/env npx tsx
/**
 * Fails the build if production is configured to show unverified/synthetic data.
 */
const flag = process.env.NEXT_PUBLIC_SHOW_UNVERIFIED;
const isProd =
  process.env.NODE_ENV === "production" ||
  process.argv.includes("--production");

if (isProd && flag === "true") {
  console.error(
    "FATAL: NEXT_PUBLIC_SHOW_UNVERIFIED=true is not allowed in production builds.",
  );
  process.exit(1);
}

console.log("Production env check passed.");
