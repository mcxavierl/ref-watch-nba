import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("ensure-cloudflare-d1-binding", () => {
  it("deploy script provisions D1 before Cloudflare deploy", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts?: { deploy?: string };
    };
    const deployScript = pkg.scripts?.deploy ?? "";
    assert.match(deployScript, /ensure-cloudflare-d1-binding\.mjs/);
    assert.match(deployScript, /cloudflare-deploy-retry\.mjs/);
    const ensureIndex = deployScript.indexOf("ensure-cloudflare-d1-binding.mjs");
    const deployIndex = deployScript.indexOf("cloudflare-deploy-retry.mjs");
    assert.ok(ensureIndex >= 0 && deployIndex > ensureIndex);
  });

  it("wrangler config keeps a patchable placeholder D1 database id", () => {
    const wrangler = readFileSync("wrangler.jsonc", "utf8");
    assert.match(wrangler, /"binding": "API_KEYS_DB"/);
    assert.match(wrangler, /"database_name": "refwatch-api-keys"/);
    assert.match(wrangler, /"database_id": "00000000-0000-0000-0000-000000000000"/);
  });

  it("cloudflare deploy retry does not treat D1 binding errors as transient", () => {
    const source = readFileSync("scripts/cloudflare-deploy-retry.mjs", "utf8");
    assert.match(source, /10181/);
  });
});
