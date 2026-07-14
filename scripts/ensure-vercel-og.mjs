/**
 * Pre-seed @vercel/og for OpenNext Cloudflare when Next trace omits edge assets.
 * Safe to run before opennextjs-cloudflare build --skipBuild.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const bundledOgDir = path.join(
  process.cwd(),
  "node_modules/next/dist/compiled/@vercel/og",
);
const targets = [
  ".open-next/server-functions/default/node_modules/next/dist/compiled/@vercel/og",
  ".open-next/server-functions/default/.next/node_modules/next/dist/compiled/@vercel/og",
];

if (!existsSync(bundledOgDir)) {
  console.warn("ensure-vercel-og: bundled @vercel/og not found, skipping");
  process.exit(0);
}

for (const rel of targets) {
  const dest = path.join(process.cwd(), rel);
  if (existsSync(path.join(dest, "index.edge.js"))) continue;
  mkdirSync(dest, { recursive: true });
  cpSync(bundledOgDir, dest, { recursive: true });
  console.log(`ensure-vercel-og: seeded ${rel}`);
}
