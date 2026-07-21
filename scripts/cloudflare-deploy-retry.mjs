import { execSync, spawnSync } from "child_process";

const maxAttempts = 4;
const retryDelaySeconds = [5, 15, 30, 45];

function isTransientCloudflareError(output) {
  const text = output.toLowerCase();
  if (text.includes("[code: 10181]")) return false;
  return (
    text.includes("[code: 10013]") ||
    text.includes("assets-upload-session") ||
    (text.includes("cloudflare api") && text.includes("failed")) ||
    text.includes("fetch failed") ||
    text.includes("network error") ||
    text.includes("econnreset") ||
    text.includes("etimedout") ||
    text.includes("socket hang up")
  );
}

function runDeploy() {
  const result = spawnSync("npx", ["opennextjs-cloudflare", "deploy"], {
    stdio: ["inherit", "pipe", "pipe"],
    encoding: "utf8",
    shell: false,
    env: process.env,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  return {
    status: result.status ?? 1,
    output: `${stdout}${stderr}`,
  };
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`Cloudflare deploy attempt ${attempt}/${maxAttempts}...`);
  const { status, output } = runDeploy();
  if (status === 0) {
    process.exit(0);
  }

  const transient = isTransientCloudflareError(output);
  if (attempt === maxAttempts || !transient) {
    process.exit(status);
  }

  const delay = retryDelaySeconds[attempt - 1] ?? 45;
  console.warn(
    `Cloudflare deploy attempt ${attempt} failed with a transient API error; retrying in ${delay}s...`,
  );
  execSync(`sleep ${delay}`);
}
