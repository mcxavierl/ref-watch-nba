#!/usr/bin/env npx tsx
/**
 * Post-deploy smoke test — fails loudly on 1102 or zero-data regressions.
 */
import { VERIFIED_LIVE_LEAGUE_IDS } from "../src/lib/league-verification";
import { isCfbSimulatedData } from "../src/lib/cfb/data-source";

const ORIGIN = (process.env.REFWATCH_DEPLOY_URL ?? "https://refwatch.ca").replace(
  /\/$/,
  "",
);

type RouteCheck = {
  path: string;
  minStatus?: number;
  maxStatus?: number;
  mustNotInclude?: string[];
  mustIncludeOne?: string[];
};

const ROUTES: RouteCheck[] = [
  {
    path: "/",
    maxStatus: 299,
    mustNotInclude: ["1102", "Error 1102", "Worker exceeded"],
    mustIncludeOne: ["577", "officials", "Multi-league"],
  },
  {
    path: "/nhl",
    maxStatus: 299,
    mustNotInclude: ["1102", "Error 1102"],
    mustIncludeOne: ["123", "officials", "12,282", "12282"],
  },
  {
    path: "/nhl/rankings",
    maxStatus: 299,
    mustNotInclude: ["1102"],
    mustIncludeOne: ["officials", "Tendencies", "rankings"],
  },
  {
    path: "/nfl/rankings",
    maxStatus: 299,
    mustNotInclude: ["1102"],
    mustIncludeOne: ["officials", "Tendencies"],
  },
  {
    path: "/compare",
    maxStatus: 299,
    mustNotInclude: ["1102", "Error 1102", "Worker exceeded"],
    mustIncludeOne: ["Official A", "Compare officials", "ref-compare"],
  },
  {
    path: "/cfb",
    maxStatus: 299,
    mustNotInclude: ["1102", "Error 1102", "Worker exceeded"],
    mustIncludeOne: ["NCAA", "football", "CFB", "offseason"],
  },
  {
    path: "/rankings",
    maxStatus: 299,
    mustNotInclude: ["1102"],
    mustIncludeOne: ["officials", "Tendencies"],
  },
];

const JSON_ASSETS = VERIFIED_LIVE_LEAGUE_IDS.filter((league) => league !== "cfb").map((league) =>
  league === "nba"
    ? "/data/nba/ref-stats.json"
    : `/data/${league}/ref-stats.json`,
);

const failures: string[] = [];

function fail(msg: string): void {
  failures.push(msg);
}

async function fetchText(url: string): Promise<{ status: number; body: string; url: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "refwatch-deploy-verify/1.0" },
  });
  return { status: res.status, body: await res.text(), url: res.url };
}

async function fetchRouteWithRetry(
  route: RouteCheck,
  url: string,
  attempts = 4,
  delayMs = 3000,
): Promise<{ status: number; body: string; url: string }> {
  let last: { status: number; body: string; url: string } | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    last = await fetchText(url);
    const okStatus =
      (route.minStatus == null || last.status >= route.minStatus) &&
      (route.maxStatus == null || last.status <= route.maxStatus);
    const needles = route.mustIncludeOne ?? [];
    const okBody =
      needles.length === 0 || needles.some((needle) => last!.body.includes(needle));
    if (okStatus && okBody) return last;
    if (attempt < attempts && last.status === 404) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }
    return last;
  }
  return last!;
}

console.log(`Production deploy verify → ${ORIGIN}`);

async function main(): Promise<void> {
  for (const route of ROUTES) {
    const url = `${ORIGIN}${route.path}`;
    try {
      const { status, body } = await fetchRouteWithRetry(route, url);
      if (route.minStatus != null && status < route.minStatus) {
        fail(`${route.path}: HTTP ${status} (need >= ${route.minStatus})`);
      }
      if (route.maxStatus != null && status > route.maxStatus) {
        fail(`${route.path}: HTTP ${status} (need <= ${route.maxStatus})`);
      }
      for (const bad of route.mustNotInclude ?? []) {
        if (body.includes(bad)) {
          fail(`${route.path}: body contains forbidden "${bad}"`);
        }
      }
      const needles = route.mustIncludeOne ?? [];
      if (
        needles.length > 0 &&
        !needles.some((needle) => body.includes(needle))
      ) {
        fail(`${route.path}: body missing expected content (${needles.join(" | ")})`);
      }
      console.log(`  ✓ ${route.path} HTTP ${status}`);
    } catch (err) {
      fail(`${route.path}: fetch failed (${err instanceof Error ? err.message : err})`);
    }
  }

  for (const assetPath of JSON_ASSETS) {
    const url = `${ORIGIN}${assetPath}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        fail(`${assetPath}: HTTP ${res.status}`);
        continue;
      }
      const data = (await res.json()) as {
        refs?: unknown[];
        meta?: { totalGamesProcessed?: number; data_verified?: boolean };
      };
      const refs = data.refs?.length ?? 0;
      const games = data.meta?.totalGamesProcessed ?? 0;
      if (refs === 0) fail(`${assetPath}: refs array is empty`);
      if (games === 0) fail(`${assetPath}: totalGamesProcessed is 0`);
      if (!data.meta?.data_verified) fail(`${assetPath}: data_verified is false`);
      console.log(`  ✓ ${assetPath} refs=${refs} games=${games}`);
    } catch (err) {
      fail(`${assetPath}: ${err instanceof Error ? err.message : err}`);
    }
  }

  const cfbAsset = `${ORIGIN}/data/cfb/ref-stats.json`;
  try {
    const res = await fetch(cfbAsset);
    if (!res.ok) {
      fail(`/data/cfb/ref-stats.json: HTTP ${res.status}`);
    } else {
      const data = (await res.json()) as {
        refs?: unknown[];
        meta?: { source?: string };
      };
      const offseason =
        isCfbSimulatedData(data.meta?.source) && (data.refs?.length ?? 0) === 0;
      console.log(
        `  ✓ /data/cfb/ref-stats.json ${offseason ? "offseason seed" : `refs=${data.refs?.length ?? 0}`}`,
      );
    }
  } catch (err) {
    fail(`/data/cfb/ref-stats.json: ${err instanceof Error ? err.message : err}`);
  }

  if (failures.length > 0) {
    console.error("\nProduction deploy verify FAILED:\n");
    for (const f of failures) {
      console.error(`  ✗ ${f}`);
    }
    process.exit(1);
  }

  console.log("\nProduction deploy verify passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
