import type { LeagueId } from "@/lib/leagues";
import { onAssignmentsIngested } from "@/lib/services/anomalyMonitor";
import type { AssignmentsFile } from "@/lib/types";

export async function postAssignmentIngest(
  leagueId: LeagueId,
  assignments: AssignmentsFile,
  options?: { dispatchWebhooks?: boolean },
): Promise<void> {
  const result = await onAssignmentsIngested(leagueId, assignments, {
    dispatchWebhooks: options?.dispatchWebhooks ?? true,
    writeArtifact: true,
  });

  const anomalyCount = result.events.length;
  if (anomalyCount === 0) {
    console.log(
      `[integrity] ${leagueId}: scanned ${result.monitor?.gameCount ?? 0} games, no anomalies.`,
    );
    return;
  }

  console.log(
    `[integrity] ${leagueId}: ${anomalyCount} anomaly event(s); ` +
      `${result.webhook.enqueued} webhook job(s) enqueued, ` +
      `${result.webhook.dispatch.delivered} delivered, ` +
      `${result.webhook.dispatch.retried} retried.`,
  );
}
