#!/usr/bin/env tsx
import { generateApiKey } from "@/lib/auth/apikey";
import { upsertApiKey } from "@/lib/auth/api-key-store";

async function main() {
  const standardKey = process.env.REFWATCH_DEMO_STANDARD_KEY ?? generateApiKey();
  const enterpriseKey = process.env.REFWATCH_DEMO_ENTERPRISE_KEY ?? generateApiKey();

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
  console.log("  standard (client_demo_syndicate)");
  console.log("  enterprise (client_demo_media)");
  if (process.env.REFWATCH_DEMO_STANDARD_KEY && process.env.REFWATCH_DEMO_ENTERPRISE_KEY) {
    console.log("Using REFWATCH_DEMO_STANDARD_KEY and REFWATCH_DEMO_ENTERPRISE_KEY from environment.");
  } else {
    console.log(
      "Generated one-time demo keys for this run. Re-run with REFWATCH_DEMO_STANDARD_KEY and REFWATCH_DEMO_ENTERPRISE_KEY to preserve them.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
