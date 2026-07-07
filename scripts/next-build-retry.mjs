import { execSync } from "child_process";
import { rmSync, mkdirSync } from "fs";

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
  rmSync(".next", { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
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
  try {
    execSync(cmd, { stdio: "inherit" });
    releaseLock();
    process.exit(0);
  } catch {
    if (attempt === maxAttempts) {
      releaseLock();
      process.exit(1);
    }
    console.warn(`next build attempt ${attempt} failed; cleaning .next and retrying...`);
    cleanNextDir();
    execSync("sleep 1");
  }
}
