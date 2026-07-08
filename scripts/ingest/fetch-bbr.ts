import * as fs from "node:fs";
import * as path from "node:path";
import { BROWSER_HEADERS } from "../lib/nba-headers";
import {
  BBR_BASE,
  BBR_CACHE_DIR,
  BBR_REQUEST_DELAY_MS,
} from "./config";

const BBR_HEADERS: Record<string, string> = {
  ...BROWSER_HEADERS,
  Referer: `${BBR_BASE}/`,
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchBbrHtml(
  url: string,
  cacheKey: string,
  force = false,
): Promise<string> {
  fs.mkdirSync(BBR_CACHE_DIR, { recursive: true });
  const cachePath = path.join(BBR_CACHE_DIR, `${cacheKey}.html`);

  if (!force && fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, "utf8");
  }

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(url, {
        headers: BBR_HEADERS,
        signal: controller.signal,
      });
      if (res.status === 429) {
        await sleep(BBR_REQUEST_DELAY_MS * attempt * 4);
        continue;
      }
      if (!res.ok) {
        throw new Error(`BBR HTTP ${res.status} for ${url}`);
      }
      const html = await res.text();
      fs.writeFileSync(cachePath, html);
      await sleep(BBR_REQUEST_DELAY_MS);
      return html;
    } catch (err) {
      lastErr = err;
      await sleep(BBR_REQUEST_DELAY_MS * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

export function readBbrCache(cacheKey: string): string | null {
  const cachePath = path.join(BBR_CACHE_DIR, `${cacheKey}.html`);
  if (!fs.existsSync(cachePath)) return null;
  return fs.readFileSync(cachePath, "utf8");
}
