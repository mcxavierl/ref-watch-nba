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

function hasCompleteStandaloneBuild() {
  return (
    existsSync(".next/BUILD_ID") &&
    existsSync(".next/server/pages-manifest.json") &&
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
  for (const file of ["BUILD_ID", "required-server-files.json", "app-build-manifest.json"]) {
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
function tryRecoverNearCompleteBuild() {
  const buildId = ".next/BUILD_ID";
  const pagesManifest = ".next/server/pages-manifest.json";
  const requiredServerFiles = ".next/required-server-files.json";
  const export500 = ".next/export/500.html";
  const dest500 = ".next/server/pages/500.html";

  if (!existsSync(buildId) || !existsSync(pagesManifest) || !existsSync(requiredServerFiles)) {
    return false;
  }

  mkdirSync(".next/server/pages", { recursive: true });
  if (existsSync(export500) && !existsSync(dest500)) {
    copyFileSync(export500, dest500);
  } else if (!existsSync(dest500)) {
    writeFileSync(
      dest500,
      "<!DOCTYPE html><html><body><h1>500</h1></body></html>",
      "utf8",
    );
  }

  materializeStandaloneOutput();
  if (hasCompleteStandaloneBuild()) {
    console.warn("next build recovered from near-complete output");
    return true;
  }

  try {
    console.warn("next build retrying trace collection after 500.html recovery...");
    execSync(cmd, { stdio: "inherit" });
  } catch {
    materializeStandaloneOutput();
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
  try {
    execSync(cmd, { stdio: "inherit" });
    if (!hasCompleteStandaloneBuild()) {
      materializeStandaloneOutput();
    }
    if (!hasCompleteStandaloneBuild()) {
      throw new Error("next build finished without standalone output");
    }
    releaseLock();
    process.exit(0);
  } catch {
    if (tryRecoverNearCompleteBuild()) {
      releaseLock();
      process.exit(0);
    }
    if (attempt === maxAttempts) {
      releaseLock();
      process.exit(1);
    }
    console.warn(`next build attempt ${attempt} failed; cleaning .next and retrying...`);
    cleanNextDir();
    execSync("sleep 2");
  }
}
