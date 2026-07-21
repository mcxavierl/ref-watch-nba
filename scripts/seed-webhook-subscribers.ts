#!/usr/bin/env npx tsx
import { randomBytes } from "node:crypto";
import { upsertWebhookSubscriber } from "@/lib/services/webhookQueue";

async function main() {
  const url = process.env.REFWATCH_WEBHOOK_URL;
  if (!url) {
    console.error("Set REFWATCH_WEBHOOK_URL to seed a webhook subscriber.");
    process.exit(1);
  }

  const clientId = process.env.REFWATCH_WEBHOOK_CLIENT_ID ?? "client_demo_syndicate";
  const secret = process.env.REFWATCH_WEBHOOK_SECRET ?? randomBytes(24).toString("hex");

  await upsertWebhookSubscriber({
    id: `sub_${clientId}`,
    clientId,
    label: "Demo B2B Webhook Subscriber",
    url,
    secret,
    active: true,
    eventKinds: ["ANOMALY_DETECTED"],
  });

  console.log(`Seeded webhook subscriber for ${clientId}`);
  console.log(`URL: ${url}`);
  console.log(`Secret: ${secret}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
