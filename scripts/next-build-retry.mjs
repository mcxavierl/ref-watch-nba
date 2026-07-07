import { execSync } from "child_process";
import { rmSync } from "fs";

const maxAttempts = 5;
const args = process.argv.slice(2).join(" ");
const cmd = `npx next build ${args}`.trim();

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    execSync(cmd, { stdio: "inherit" });
    process.exit(0);
  } catch {
    if (attempt === maxAttempts) process.exit(1);
    console.warn(`next build attempt ${attempt} failed; cleaning .next and retrying...`);
    rmSync(".next", { recursive: true, force: true });
  }
}
