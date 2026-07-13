/**
 * Helpers for global fetch() on Cloudflare Workers with global_fetch_strictly_public.
 * Binding fetches (ASSETS, WORKER_SELF_REFERENCE) are not subject to these checks.
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "::1",
]);

const PRIVATE_IPV4 =
  /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/;

/** True when global fetch() is allowed to target this absolute URL. */
export function isPublicFetchUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) return false;
    if (host.endsWith(".local") || host.endsWith(".internal")) return false;
    if (PRIVATE_IPV4.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Workers with ASSETS must not self-fetch via the public site URL (doubles CPU/memory). */
export async function shouldSkipOriginFetch(): Promise<boolean> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    return Boolean(
      (env as { ASSETS?: unknown }).ASSETS ??
        (env as { WORKER_SELF_REFERENCE?: unknown }).WORKER_SELF_REFERENCE,
    );
  } catch {
    return false;
  }
}

export async function safeOriginFetch(
  origin: string,
  assetPath: string,
  init?: RequestInit,
): Promise<Response | null> {
  if (!origin?.trim() || !assetPath.startsWith("/")) return null;
  if (await shouldSkipOriginFetch()) return null;

  const url = `${origin.replace(/\/$/, "")}${assetPath}`;
  if (!isPublicFetchUrl(url)) return null;

  try {
    return await fetch(url, init);
  } catch (error) {
    console.error("[refwatch] origin fetch failed", url, error);
    return null;
  }
}

export async function safeOriginJson(
  origin: string,
  assetPath: string,
): Promise<unknown | null> {
  const res = await safeOriginFetch(origin, assetPath);
  if (!res?.ok) return null;
  try {
    return await res.json();
  } catch (error) {
    console.error("[refwatch] origin JSON parse failed", assetPath, error);
    return null;
  }
}
