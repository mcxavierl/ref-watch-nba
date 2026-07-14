#!/usr/bin/env node
/**
 * Wrap OpenNext's generated worker fetch handler with passThroughOnException,
 * request-scoped isolate store, and structured error logging.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const workerPath = join(process.cwd(), ".open-next", "worker.js");
const ISOLATE_RUN = "__refwatch_run_worker_isolate__";
const ISOLATE_END = "__refwatch_end_worker_isolate__";
const ISOLATE_CLOSE_MARKER = `__refwatchRun(__refwatchExec)`;

if (!existsSync(workerPath)) {
  console.error("patch-worker-entry: missing .open-next/worker.js — run build:opennext first");
  process.exit(1);
}

let source = readFileSync(workerPath, "utf8");

const isFullyPatched =
  source.includes("passThroughOnException") &&
  source.includes(ISOLATE_RUN) &&
  source.includes(ISOLATE_CLOSE_MARKER);

if (isFullyPatched) {
  console.log("patch-worker-entry: already patched");
  process.exit(0);
}

const fetchOpen = `export default {
    async fetch(request, env, ctx) {
        return runWithCloudflareRequestContext(request, env, ctx, async () => {`;

const fetchOpenPatched = `export default {
    async fetch(request, env, ctx) {
        ctx.passThroughOnException();
        try {
            return await runWithCloudflareRequestContext(request, env, ctx, async () => {
                const __refwatchRun = globalThis[Symbol.for('${ISOLATE_RUN}')];
                const __refwatchExec = async () => {`;

if (!source.includes(fetchOpen) && !source.includes("passThroughOnException")) {
  console.error("patch-worker-entry: unexpected worker.js fetch handler shape");
  process.exit(1);
}

if (!source.includes("passThroughOnException")) {
  source = source.replace(fetchOpen, fetchOpenPatched);
} else if (!source.includes(ISOLATE_RUN)) {
  const cfContextOpen = `return await runWithCloudflareRequestContext(request, env, ctx, async () => {`;
  const cfContextOpenPatched = `return await runWithCloudflareRequestContext(request, env, ctx, async () => {
                const __refwatchRun = globalThis[Symbol.for('${ISOLATE_RUN}')];
                const __refwatchExec = async () => {`;
  if (!source.includes(cfContextOpen)) {
    console.error("patch-worker-entry: could not locate Cloudflare request context callback");
    process.exit(1);
  }
  source = source.replace(cfContextOpen, cfContextOpenPatched);
}

const fetchClose = `        });
    },
};`;

const LEGACY_HYDRATION_KEYS = [
  "__REFWATCH_NBA_REF_STATS__",
  "__REFWATCH_NHL_REF_STATS__",
  "__REFWATCH_NFL_REF_STATS__",
  "__REFWATCH_CBB_REF_STATS__",
  "__REFWATCH_CFB_REF_STATS__",
  "__REFWATCH_EPL_REF_STATS__",
  "__REFWATCH_LALIGA_REF_STATS__",
  "__REFWATCH_NBA_TEAM_SPLITS__",
  "__REFWATCH_NHL_TEAM_SPLITS__",
  "__REFWATCH_NFL_TEAM_SPLITS__",
  "__REFWATCH_EPL_TEAM_SPLITS__",
  "__REFWATCH_LALIGA_TEAM_SPLITS__",
  "__REFWATCH_CBB_TEAM_SPLITS__",
  "__REFWATCH_NBA_GAME_LOGS__",
  "__REFWATCH_NHL_GAME_LOGS__",
  "__REFWATCH_NFL_GAME_LOGS__",
  "__REFWATCH_EPL_GAME_LOGS__",
  "__REFWATCH_LALIGA_GAME_LOGS__",
  "__REFWATCH_CBB_GAME_LOGS__",
  "__REFWATCH_CFB_GAME_LOGS__",
  "__REFWATCH_CBB_NCAA_COMPONENTS__",
  "__REFWATCH_CFB_NCAA_COMPONENTS__",
  "__REFWATCH_SCOPED_STATS_CACHE__",
];

const fetchClosePatched = `                };
                return typeof __refwatchRun === 'function'
                    ? __refwatchRun(__refwatchExec)
                    : __refwatchExec();
        });
        } catch (error) {
            console.error("[refwatch] worker fetch failed", request.url, error);
            throw error;
        } finally {
            try {
                const endIsolate = globalThis[Symbol.for('${ISOLATE_END}')];
                if (typeof endIsolate === 'function') {
                    endIsolate();
                }
                const g = globalThis;
                for (const key of ${JSON.stringify(LEGACY_HYDRATION_KEYS)}) {
                    g[key] = undefined;
                }
            } catch (cleanupError) {
                console.error("[refwatch] worker isolate cleanup failed", cleanupError);
            }
        }
    },
};`;

const legacyFetchClose = `        });
        } catch (error) {
            console.error("[refwatch] worker fetch failed", request.url, error);
            throw error;
        } finally {
            try {
                const g = globalThis;
                for (const key of ${JSON.stringify(LEGACY_HYDRATION_KEYS)}) {
                    g[key] = undefined;
                }
            } catch (cleanupError) {
                console.error("[refwatch] worker isolate cleanup failed", cleanupError);
            }
        }
    },
};`;

if (source.includes(ISOLATE_CLOSE_MARKER)) {
  console.log("patch-worker-entry: close wrapper already present");
} else if (source.includes(legacyFetchClose)) {
  source = source.replace(legacyFetchClose, fetchClosePatched);
} else if (source.includes(fetchClose)) {
  source = source.replace(fetchClose, fetchClosePatched);
} else {
  console.error("patch-worker-entry: could not close fetch try/catch wrapper");
  process.exit(1);
}

writeFileSync(workerPath, source);
console.log("patch-worker-entry: wrapped .open-next/worker.js with isolate store + passThroughOnException");
