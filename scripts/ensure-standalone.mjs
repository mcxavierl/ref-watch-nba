import { cpSync, existsSync, mkdirSync, copyFileSync, readFileSync } from "fs";

function restoreServerManifestsFromStandalone() {
  const standaloneServer = ".next/standalone/.next/server";
  if (!existsSync(standaloneServer)) return;
  mkdirSync(".next/server", { recursive: true });
  for (const file of [
    "middleware-manifest.json",
    "middleware-build-manifest.js",
    "pages-manifest.json",
    "app-paths-manifest.json",
    "functions-config-manifest.json",
  ]) {
    const src = `${standaloneServer}/${file}`;
    const dest = `.next/server/${file}`;
    if (existsSync(src) && !existsSync(dest)) {
      copyFileSync(src, dest);
    }
  }
}

function ensureStandaloneOutput() {
  const buildId = ".next/BUILD_ID";
  const pagesManifest = ".next/server/pages-manifest.json";
  const requiredServerFiles = ".next/required-server-files.json";
  const prerenderManifest = ".next/prerender-manifest.json";
  if (
    !existsSync(buildId) ||
    !existsSync(pagesManifest) ||
    !existsSync(requiredServerFiles) ||
    !existsSync(prerenderManifest)
  ) {
    console.error("ensure-standalone: incomplete .next build; run npm run build first");
    process.exit(1);
  }

  restoreServerManifestsFromStandalone();

  const standaloneNext = ".next/standalone/.next";
  const standaloneServer = `${standaloneNext}/server`;

  mkdirSync(standaloneServer, { recursive: true });
  if (existsSync(".next/server")) {
    console.warn("ensure-standalone: syncing .next/server into standalone output");
    cpSync(".next/server", standaloneServer, { recursive: true });
  }

  if (existsSync(".next/static")) {
    mkdirSync(`${standaloneNext}/static`, { recursive: true });
    cpSync(".next/static", `${standaloneNext}/static`, { recursive: true });
  }

  for (const file of ["BUILD_ID", "required-server-files.json", "app-build-manifest.json", "prerender-manifest.json"]) {
    const src = `.next/${file}`;
    if (existsSync(src)) {
      copyFileSync(src, `${standaloneNext}/${file}`);
    }
  }

  const { files } = JSON.parse(readFileSync(requiredServerFiles, "utf8"));
  for (const rel of files ?? []) {
    const src = rel.startsWith(".next/") ? rel : `.next/${rel}`;
    if (!existsSync(src)) continue;
    const dest = `.next/standalone/${rel}`;
    mkdirSync(dest.substring(0, dest.lastIndexOf("/")), { recursive: true });
    cpSync(src, dest, { recursive: true });
  }

  if (existsSync("package.json")) {
    copyFileSync("package.json", ".next/standalone/package.json");
  }

  const critical = [
    ".next/server/middleware-manifest.json",
    ".next/next-server.js.nft.json",
    ".next/server/app/_not-found/page.js.nft.json",
  ];
  for (const file of critical) {
    if (!existsSync(file)) {
      console.error(`ensure-standalone: missing ${file}`);
      process.exit(1);
    }
  }
}

ensureStandaloneOutput();
