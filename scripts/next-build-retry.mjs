import { execSync } from "child_process";
import {
  cpSync,
  existsSync,
  copyFileSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
} from "fs";

const maxAttempts = 8;
const args = process.argv.slice(2).join(" ");
const cmd = `npx next build ${args}`.trim();
const lockDir = "/tmp/ref-watch-build.lockdir";

function acquireLock() {
  for (let i = 0; i < 120; i++) {
    try {
      mkdirSync(lockDir);
      return;
    } catch {
      execSync("sleep 2");
    }
  }
  throw new Error("Timed out waiting for build lock");
}

function releaseLock() {
  try {
    rmSync(lockDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch {
    // ignore
  }
}

function cleanNextDir() {
  rmSync(".next", { recursive: true, force: true, maxRetries: 8, retryDelay: 300 });
}

const FALLBACK_500_HTML =
  "<!DOCTYPE html><html><body><h1>500</h1></body></html>";

function ensure500HtmlArtifacts() {
  mkdirSync(".next/export", { recursive: true });
  mkdirSync(".next/server/pages", { recursive: true });
  if (!existsSync(".next/export/500.html")) {
    writeFileSync(".next/export/500.html", FALLBACK_500_HTML, "utf8");
  }
  if (!existsSync(".next/server/pages/500.html")) {
    writeFileSync(".next/server/pages/500.html", FALLBACK_500_HTML, "utf8");
  }
}

function isNearCompleteBuild() {
  return (
    existsSync(".next/BUILD_ID") &&
    existsSync(".next/server/pages-manifest.json") &&
    existsSync(".next/prerender-manifest.json")
  );
}
function hasCompleteStandaloneBuild() {
  return (
    existsSync(".next/BUILD_ID") &&
    existsSync(".next/next-server.js.nft.json") &&
    existsSync(".next/server/pages-manifest.json") &&
    existsSync(".next/server/middleware-manifest.json") &&
    existsSync(".next/required-server-files.json") &&
    existsSync(".next/standalone/.next/server/pages-manifest.json")
  );
}

/** Next can finish SSG then fail moving export/500.html; OpenNext still needs standalone/. */
function materializeStandaloneOutput() {
  const standaloneNext = ".next/standalone/.next";
  const standaloneServer = `${standaloneNext}/server`;
  if (existsSync(`${standaloneServer}/pages-manifest.json`)) return;

  mkdirSync(standaloneServer, { recursive: true });
  cpSync(".next/server", standaloneServer, { recursive: true });
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

  const required = ".next/required-server-files.json";
  if (existsSync(required)) {
    const { files } = JSON.parse(readFileSync(required, "utf8"));
    for (const rel of files ?? []) {
      const src = rel.startsWith(".next/") ? rel : `.next/${rel}`;
      if (!existsSync(src)) continue;
      const dest = `.next/standalone/${rel}`;
      mkdirSync(dest.substring(0, dest.lastIndexOf("/")), { recursive: true });
      cpSync(src, dest, { recursive: true });
    }
  }

  const pkg = "package.json";
  if (existsSync(pkg)) {
    copyFileSync(pkg, ".next/standalone/package.json");
  }
}

/** Recover when Next finishes SSG but fails renaming export/500.html or trace collection. */
function tryRecoverNearCompleteBuild(attempt) {
  if (!isNearCompleteBuild()) {
    return false;
  }

  ensure500HtmlArtifacts();
  materializeStandaloneOutput();
  if (hasCompleteStandaloneBuild()) {
    console.warn("next build recovered from near-complete output");
    return true;
  }

  if (!existsSync(".next/required-server-files.json") || !existsSync(".next/next-server.js.nft.json")) {
    try {
      console.warn("next build retrying trace collection after 500.html recovery...");
      execSync(cmd, {
        stdio: "inherit",
        env: { ...process.env, KEEP_NEXT_DIST: "1" },
      });
    } catch {
      ensure500HtmlArtifacts();
      materializeStandaloneOutput();
    }
  }

  if (hasCompleteStandaloneBuild()) {
    console.warn("next build recovered after trace retry");
    return true;
  }

  return false;
}

acquireLock();
process.on("exit", releaseLock);
process.on("SIGINT", () => {
  releaseLock();
  process.exit(1);
});
process.on("SIGTERM", () => {
  releaseLock();
  process.exit(1);
});

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  mkdirSync(".next/server/pages", { recursive: true });
  const buildEnv =
    attempt > 1 ? { ...process.env, KEEP_NEXT_DIST: "1" } : process.env;
  try {
    execSync(cmd, { stdio: "inherit", env: buildEnv });
    if (!hasCompleteStandaloneBuild()) {
      materializeStandaloneOutput();
    }
    if (!hasCompleteStandaloneBuild()) {
      throw new Error("next build finished without standalone output");
    }
    releaseLock();
    process.exit(0);
  } catch {
    if (tryRecoverNearCompleteBuild(attempt)) {
      releaseLock();
      process.exit(0);
    }
    if (attempt === maxAttempts) {
      releaseLock();
      process.exit(1);
    }
    const hasPartialBuild = isNearCompleteBuild();
    if (!hasPartialBuild) {
      console.warn(`next build attempt ${attempt} failed; cleaning .next and retrying...`);
      cleanNextDir();
    } else {
      console.warn(`next build attempt ${attempt} failed; keeping partial .next and retrying...`);
    }
    execSync("sleep 2");
  }
}
