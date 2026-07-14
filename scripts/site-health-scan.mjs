#!/usr/bin/env node
/**
 * Batch HTTP health scan for refwatch.ca
 * Usage: node scripts/site-health-scan.mjs
 */
const BASE = "https://refwatch.ca";
const DELAY_MS = 150;

const STATIC = [
  "/",
  "/compare",
  "/methodology",
  "/partners",
  "/overview",
];

const LEAGUES = [
  { id: "nba", prefix: "", hubs: ["rankings", "trends", "research", "insights", "matrix", "refs", "teams", "crews"] },
  { id: "nhl", prefix: "/nhl", hubs: ["rankings", "trends", "research", "insights", "matrix", "refs", "teams", "crews"] },
  { id: "nfl", prefix: "/nfl", hubs: ["rankings", "trends", "research", "insights", "matrix", "refs", "teams", "crews"] },
  { id: "epl", prefix: "/epl", hubs: ["rankings", "trends", "research", "insights", "matrix", "refs", "teams", "crews"] },
  { id: "laliga", prefix: "/laliga", hubs: ["rankings", "trends", "research", "insights", "matrix", "refs", "teams", "crews"] },
  { id: "cbb", prefix: "/cbb", hubs: ["rankings", "trends", "research", "insights", "matrix", "refs", "teams", "crews"] },
  { id: "cfb", prefix: "/cfb", hubs: ["rankings", "trends", "research", "insights", "matrix", "refs", "teams", "crews"] },
];

const COMING_SOON = ["/wnba", "/wnba/rankings", "/mlb", "/mlb/rankings"];

const DYNAMIC = [
  "/refs/jacyn-goble-68",
  "/nhl/refs/shandor-alphonso-52",
  "/nfl/refs/shawn-hochuli-83",
  "/epl/refs/anthony-taylor-0",
  "/laliga/refs/c-sar-soto-grado-0",
  "/nfl/teams/KC",
  "/epl/teams/ARS",
  "/laliga/teams/BAR",
  "/teams/LAL",
  "/feed/nba/rss",
  "/feed/nba/json",
  "/feed/nhl/rss",
  "/feed/nhl/json",
];

function buildUrls() {
  const urls = [...STATIC];
  for (const lg of LEAGUES) {
    urls.push(lg.prefix || "/nba");
    for (const hub of lg.hubs) {
      urls.push(`${lg.prefix}/${hub}`);
    }
  }
  urls.push(...COMING_SOON, ...DYNAMIC);
  return [...new Set(urls)];
}

const ERROR_PATTERNS = [
  { key: "1102", re: /1102|Worker exceeded|exceeded CPU time/i },
  { key: "1101", re: /1101|Worker threw exception/i },
  { key: "500", re: /Internal Server Error|500 Internal/i },
  { key: "cf-error", re: /cloudflare.*error|Ray ID|Error code 5\d\d/i },
];

async function checkPath(path) {
  const url = `${BASE}${path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "RefWatch-HealthScan/1.0" },
    });
    const elapsed = Date.now() - start;
    const body = await res.text();
    const notes = [];
    for (const { key, re } of ERROR_PATTERNS) {
      if (re.test(body)) notes.push(key);
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location") || "";
      notes.push(`→${loc.replace(BASE, "")}`);
    }
    if (elapsed > 5000) notes.push(`slow:${elapsed}ms`);
    else notes.push(`${elapsed}ms`);
    return { path, status: res.status, notes: notes.join(", ") };
  } catch (err) {
    return { path, status: "ERR", notes: String(err.message) };
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const urls = buildUrls();
  const results = [];
  console.log(`Scanning ${urls.length} URLs on ${BASE}...\n`);
  console.log("route|status|notes");
  console.log("---|---|---");
  for (const path of urls) {
    const r = await checkPath(path);
    results.push(r);
    console.log(`${r.path}|${r.status}|${r.notes}`);
    await sleep(DELAY_MS);
  }

  const errors404 = results.filter((r) => r.status === 404);
  const errors500 = results.filter((r) => r.status === 500 || r.status === 502 || r.status === 503);
  const errors110x = results.filter((r) => r.notes.includes("1102") || r.notes.includes("1101"));
  const errorsOther = results.filter((r) => r.status === "ERR" || (typeof r.status === "number" && r.status >= 500));

  console.log("\n=== SUMMARY ===");
  console.log(`Total: ${results.length}, OK-ish: ${results.filter((r) => r.status === 200 || (r.status >= 300 && r.status < 400)).length}`);
  console.log(`404s: ${errors404.length}`);
  console.log(`5xx: ${errors500.length}`);
  console.log(`110x in body: ${errors110x.length}`);
  if (errors404.length) console.log("404 list:", errors404.map((r) => r.path).join(", "));
  if (errors500.length) console.log("500 list:", errors500.map((r) => r.path).join(", "));
  if (errors110x.length) console.log("110x list:", errors110x.map((r) => r.path).join(", "));
}

main().catch(console.error);
