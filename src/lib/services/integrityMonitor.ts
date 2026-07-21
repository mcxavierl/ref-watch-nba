import {
  dispatchAnomalyWebhookEvents,
  processWebhookQueue,
} from "@/lib/services/webhookDispatch";
import {
  runAnomalyMonitorForIngestedAssignments,
  writeAnomalyMonitorArtifact,
} from "@/lib/services/run-anomaly-monitor";
import { summarizeAnomalyMonitor } from "@/lib/services/anomalyMonitor";

export type IntegrityMonitorRunResult = {
  monitor: ReturnType<typeof summarizeAnomalyMonitor>;
  webhook: Awaited<ReturnType<typeof dispatchAnomalyWebhookEvents>>;
};

export async function runIntegrityMonitorPipeline(options?: {
  processWebhooks?: boolean;
}): Promise<IntegrityMonitorRunResult> {
  const results = runAnomalyMonitorForIngestedAssignments();
  writeAnomalyMonitorArtifact(results);

  const events = results.flatMap((row) => row.events);
  const webhook = await dispatchAnomalyWebhookEvents(events, {
    processImmediately: options?.processWebhooks ?? true,
    maxPasses: 4,
  });

  return {
    monitor: summarizeAnomalyMonitor(results),
    webhook,
  };
}

export async function drainWebhookQueue(): Promise<
  Awaited<ReturnType<typeof processWebhookQueue>>
> {
  let last = await processWebhookQueue();
  let guard = 0;
  while (last.processed > 0 && guard < 20) {
    last = await processWebhookQueue();
    guard += 1;
  }
  return last;
}
