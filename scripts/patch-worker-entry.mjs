#!/usr/bin/env node
/**
 * Wrap OpenNext's generated worker fetch handler with passThroughOnException
 * and structured error logging so catastrophic failures fail over to ASSETS.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const workerPath = join(process.cwd(), ".open-next", "worker.js");

if (!existsSync(workerPath)) {
  console.error("patch-worker-entry: missing .open-next/worker.js — run build:opennext first");
  process.exit(1);
}

let source = readFileSync(workerPath, "utf8");

if (source.includes("passThroughOnException")) {
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
            return await runWithCloudflareRequestContext(request, env, ctx, async () => {`;

if (!source.includes(fetchOpen)) {
  console.error("patch-worker-entry: unexpected worker.js fetch handler shape");
  process.exit(1);
}

source = source.replace(fetchOpen, fetchOpenPatched);

const fetchClose = `        });
    },
};`;

const fetchClosePatched = `        });
        } catch (error) {
            console.error("[refwatch] worker fetch failed", request.url, error);
            throw error;
        }
    },
};`;

if (!source.includes(fetchClose)) {
  console.error("patch-worker-entry: could not close fetch try/catch wrapper");
  process.exit(1);
}

source = source.replace(fetchClose, fetchClosePatched);
writeFileSync(workerPath, source);
console.log("patch-worker-entry: wrapped .open-next/worker.js with passThroughOnException");
