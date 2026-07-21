#!/usr/bin/env tsx
import { generateApiKey } from "@/lib/auth/apikey";
import { upsertApiKey } from "@/lib/auth/api-key-store";

async function main() {
  const standardKey = generateApiKey();
  const enterpriseKey = generateApiKey();

  await upsertApiKey({
    id: "key_demo_standard",
    clientId: "client_demo_syndicate",
    label: "Demo Standard Syndicate",
    tier: "standard",
    plaintextKey: standardKey,
  });

  await upsertApiKey({
    id: "key_demo_enterprise",
    clientId: "client_demo_media",
    label: "Demo Enterprise Media",
    tier: "enterprise",
    plaintextKey: enterpriseKey,
  });

  console.log("Seeded enterprise API keys:");
  console.log(`  standard (${standardKey})`);
  console.log(`  enterprise (${enterpriseKey})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
