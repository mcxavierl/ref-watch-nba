/** Browser cache + CDN edge cache for daily-refreshed JSON data under /data/*. */
export const DATA_JSON_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=600";

/** Long-lived immutable cache for versioned static assets (logos, SVGs). */
export const STATIC_ASSET_CACHE_CONTROL =
  "public, max-age=31536000, immutable";

/** Feed JSON/RSS payloads (nightly syndication). */
export const FEED_CACHE_CONTROL = DATA_JSON_CACHE_CONTROL;

export function cacheControlHeader(
  value: string,
): { "Cache-Control": string } {
  return { "Cache-Control": value };
}
