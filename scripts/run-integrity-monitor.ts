#!/usr/bin/env npx tsx
import { runIntegrityMonitorPipeline } from "@/lib/services/integrityMonitor";

async function main() {
  const result = await runIntegrityMonitorPipeline({ processWebhooks: true });
  console.log(
    JSON.stringify(
      {
        gamesScanned: result.monitor.gamesScanned,
        anomaliesDetected: result.monitor.anomaliesDetected,
        webhookEnqueued: result.webhook.enqueued,
        webhookDelivered: result.webhook.dispatch.delivered,
        webhookRetried: result.webhook.dispatch.retried,
        webhookDead: result.webhook.dispatch.dead,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
