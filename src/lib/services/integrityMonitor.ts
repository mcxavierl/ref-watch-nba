import {
  onBatchAssignmentsIngested,
  summarizeAnomalyMonitor,
} from "@/lib/services/anomalyMonitor";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import { processWebhookQueue } from "@/lib/services/webhookDispatch";

export type IntegrityMonitorRunResult = {
  monitor: ReturnType<typeof summarizeAnomalyMonitor>;
  webhook: Awaited<ReturnType<typeof onBatchAssignmentsIngested>>["webhook"];
};

export async function runIntegrityMonitorPipeline(options?: {
  processWebhooks?: boolean;
  leagueIds?: ReturnType<typeof activeLiveLeagueIds>;
}): Promise<IntegrityMonitorRunResult> {
  const batch = await onBatchAssignmentsIngested(
    options?.leagueIds ?? activeLiveLeagueIds(),
    {
      dispatchWebhooks: options?.processWebhooks ?? true,
      writeArtifact: true,
    },
  );

  if (options?.processWebhooks ?? true) {
    await drainWebhookQueue();
  }

  return {
    monitor: batch.summary,
    webhook: batch.webhook,
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
