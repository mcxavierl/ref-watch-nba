import { execSync } from "node:child_process";
import fs from "node:fs";

const WRANGLER_PATH = "wrangler.jsonc";
const DB_NAME = "refwatch-api-keys";
const PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000000";
const SCHEMA_PATH = "src/lib/auth/api-key-schema.sql";

function hasCloudflareCredentials() {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
}

function runWrangler(args) {
  return execSync(`npx wrangler ${args}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
}

function listDatabases() {
  try {
    const output = runWrangler("d1 list --json");
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list Cloudflare D1 databases: ${message}`);
  }
}

function createDatabase() {
  try {
    const output = runWrangler(`d1 create ${DB_NAME}`);
    const match = output.match(/database_id\s*=\s*"([^"]+)"/i);
    if (match?.[1]) return match[1];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) {
      throw new Error(`Failed to create Cloudflare D1 database ${DB_NAME}: ${message}`);
    }
  }

  const existing = listDatabases().find((row) => row.name === DB_NAME);
  if (!existing?.uuid) {
    throw new Error(`Cloudflare D1 database ${DB_NAME} exists but could not be resolved`);
  }
  return existing.uuid;
}

function resolveDatabaseId() {
  const overrideId = process.env.CLOUDFLARE_D1_API_KEYS_DATABASE_ID?.trim();
  if (overrideId) return overrideId;

  const existing = listDatabases().find((row) => row.name === DB_NAME);
  if (existing?.uuid) return existing.uuid;

  return createDatabase();
}

function patchWranglerConfig(databaseId) {
  const content = fs.readFileSync(WRANGLER_PATH, "utf8");
  if (content.includes(`"database_id": "${databaseId}"`)) {
    return;
  }
  if (!content.includes(PLACEHOLDER_ID)) {
    throw new Error(
      `${WRANGLER_PATH} is missing the ${DB_NAME} placeholder database_id; cannot patch D1 binding`,
    );
  }
  fs.writeFileSync(
    WRANGLER_PATH,
    content.replaceAll(PLACEHOLDER_ID, databaseId),
  );
}

function applySchema() {
  runWrangler(`d1 execute ${DB_NAME} --remote --file=${SCHEMA_PATH}`);
}

function main() {
  if (!hasCloudflareCredentials()) {
    console.log(
      "Skipping Cloudflare D1 binding setup (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set).",
    );
    return;
  }

  const databaseId = resolveDatabaseId();
  patchWranglerConfig(databaseId);
  applySchema();
  console.log(`Cloudflare D1 ready: ${DB_NAME} (${databaseId})`);
}

main();
