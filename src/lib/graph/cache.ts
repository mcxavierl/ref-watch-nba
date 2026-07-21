/** One-hour TTL for graph traversal results (live UI + API v1). */
export const GRAPH_CACHE_TTL_MS = 60 * 60 * 1000;

interface GraphCacheEntry<T> {
  value: T;
  expiresAt: number;
}

const graphQueryCache = new Map<string, GraphCacheEntry<unknown>>();

export function graphCacheKey(parts: readonly string[]): string {
  return parts.join(":");
}

/**
 * In-memory graph query cache with 1-hour TTL.
 * Persists across warm worker isolates for sub-20ms repeat lookups.
 */
export function withGraphCache<T>(key: string, compute: () => T): T {
  const now = Date.now();
  const hit = graphQueryCache.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const value = compute();
  graphQueryCache.set(key, {
    value,
    expiresAt: now + GRAPH_CACHE_TTL_MS,
  });
  return value;
}

/** Test and isolate teardown hook. */
export function clearGraphQueryCache(): void {
  graphQueryCache.clear();
}
