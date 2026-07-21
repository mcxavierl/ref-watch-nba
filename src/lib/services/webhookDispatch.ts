import type { WebhookQueueJob } from "@/lib/services/webhookQueue";
import {
  enqueueEnterpriseWebhookPayloads,
  getWebhookStore,
  signWebhookPayload,
  WEBHOOK_MAX_ATTEMPTS,
  type WebhookStore,
} from "@/lib/services/webhookQueue";
import type { AnomalyDetectedEvent } from "@/lib/services/anomalyMonitor";
import type { EnterpriseWebhookPayload } from "@/lib/services/webhookPayload";

export type WebhookDispatchSummary = {
  enqueued: number;
  processed: number;
  delivered: number;
  retried: number;
  dead: number;
};

/** Enterprise retry schedule: 0s, +30s, +2m, +10m, +1h */
export const WEBHOOK_RETRY_DELAYS_MS = [0, 30_000, 120_000, 600_000, 3_600_000] as const;

export function computeWebhookBackoffMs(attemptCount: number): number {
  if (attemptCount <= 0) return WEBHOOK_RETRY_DELAYS_MS[0];
  const index = Math.min(attemptCount, WEBHOOK_RETRY_DELAYS_MS.length - 1);
  return WEBHOOK_RETRY_DELAYS_MS[index] ?? WEBHOOK_RETRY_DELAYS_MS.at(-1)!;
}

function parseEventType(payload: string): string {
  try {
    const body = JSON.parse(payload) as { event?: string };
    return body.event ?? "ANOMALY_DETECTED";
  } catch {
    return "ANOMALY_DETECTED";
  }
}

async function deliverWebhookJob(
  job: WebhookQueueJob,
  url: string,
  secret: string,
): Promise<{ ok: boolean; statusCode: number | null; error?: string; latencyMs: number }> {
  const startedAt = Date.now();
  try {
    const signature = signWebhookPayload(secret, job.payload);
    const eventType = parseEventType(job.payload);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-RefWatch-Signature": signature,
        "x-refwatch-event": eventType,
        "user-agent": "RefWatch-Webhook-Dispatcher/1.0",
      },
      body: job.payload,
    });
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      return {
        ok: false,
        statusCode: response.status,
        error: `HTTP ${response.status}`,
        latencyMs,
      };
    }
    return { ok: true, statusCode: response.status, latencyMs };
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      error: error instanceof Error ? error.message : "Webhook delivery failed",
      latencyMs: Date.now() - startedAt,
    };
  }
}

export async function processWebhookQueue(options?: {
  batchSize?: number;
  now?: Date;
  store?: WebhookStore;
}): Promise<WebhookDispatchSummary> {
  const store = options?.store ?? (await getWebhookStore());
  const subscribers = await store.listActiveSubscribers();
  const subscriberById = new Map(subscribers.map((row) => [row.id, row]));
  const nowIso = (options?.now ?? new Date()).toISOString();
  const jobs = await store.claimDueJobs(options?.batchSize ?? 25, nowIso);

  const summary: WebhookDispatchSummary = {
    enqueued: 0,
    processed: 0,
    delivered: 0,
    retried: 0,
    dead: 0,
  };

  for (const job of jobs) {
    summary.processed += 1;
    const subscriber = subscriberById.get(job.subscriberId);
    const eventType = parseEventType(job.payload);
    if (!subscriber || !subscriber.active) {
      await store.markDead(job.id, "Subscriber inactive or missing");
      await store.logWebhookEvent({
        subscriberId: job.subscriberId,
        eventType,
        queueId: job.id,
        responseCode: null,
        attemptCount: job.attemptCount + 1,
        status: "dead",
        payloadExcerpt: job.payload.slice(0, 240),
        errorMessage: "Subscriber inactive or missing",
      });
      summary.dead += 1;
      continue;
    }

    const result = await deliverWebhookJob(job, subscriber.url, subscriber.secret);
    await store.logDelivery({
      queueId: job.id,
      subscriberId: job.subscriberId,
      clientId: job.clientId,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      success: result.ok,
      errorMessage: result.error,
    });

    if (result.ok) {
      await store.markDelivered(job.id, new Date().toISOString());
      await store.logWebhookEvent({
        subscriberId: job.subscriberId,
        eventType,
        queueId: job.id,
        responseCode: result.statusCode,
        attemptCount: job.attemptCount + 1,
        status: "delivered",
        payloadExcerpt: job.payload.slice(0, 240),
      });
      summary.delivered += 1;
      continue;
    }

    const nextAttemptCount = job.attemptCount + 1;
    if (nextAttemptCount >= (job.maxAttempts || WEBHOOK_MAX_ATTEMPTS)) {
      await store.markDead(job.id, result.error ?? "Delivery failed");
      await store.logWebhookEvent({
        subscriberId: job.subscriberId,
        eventType,
        queueId: job.id,
        responseCode: result.statusCode,
        attemptCount: nextAttemptCount,
        status: "dead",
        payloadExcerpt: job.payload.slice(0, 240),
        errorMessage: result.error,
      });
      summary.dead += 1;
      continue;
    }

    const nextAttemptAt = new Date(
      Date.now() + computeWebhookBackoffMs(nextAttemptCount),
    ).toISOString();
    await store.markRetry(
      { ...job, attemptCount: nextAttemptCount },
      result.error ?? "Delivery failed",
      nextAttemptAt,
    );
    await store.logWebhookEvent({
      subscriberId: job.subscriberId,
      eventType,
      queueId: job.id,
      responseCode: result.statusCode,
      attemptCount: nextAttemptCount,
      status: "failed",
      payloadExcerpt: job.payload.slice(0, 240),
      errorMessage: result.error,
    });
    summary.retried += 1;
  }

  return summary;
}

export async function dispatchAnomalyWebhookEvents(
  events: AnomalyDetectedEvent[],
  options?: { processImmediately?: boolean; maxPasses?: number },
): Promise<{
  enqueued: number;
  dispatch: WebhookDispatchSummary;
}> {
  const enqueued = await enqueueEnterpriseWebhookPayloads(events);
  const aggregate: WebhookDispatchSummary = {
    enqueued,
    processed: 0,
    delivered: 0,
    retried: 0,
    dead: 0,
  };

  if (!options?.processImmediately) {
    return { enqueued, dispatch: aggregate };
  }

  const passes = options.maxPasses ?? 3;
  for (let pass = 0; pass < passes; pass += 1) {
    const result = await processWebhookQueue();
    aggregate.processed += result.processed;
    aggregate.delivered += result.delivered;
    aggregate.retried += result.retried;
    aggregate.dead += result.dead;
    if (result.processed === 0) break;
  }

  return { enqueued, dispatch: aggregate };
}

export async function dispatchEnterpriseWebhookPayloads(
  payloads: EnterpriseWebhookPayload[],
  options?: { processImmediately?: boolean; maxPasses?: number },
): Promise<{
  enqueued: number;
  dispatch: WebhookDispatchSummary;
}> {
  const enqueued = await enqueueEnterpriseWebhookPayloads(payloads);
  const aggregate: WebhookDispatchSummary = {
    enqueued,
    processed: 0,
    delivered: 0,
    retried: 0,
    dead: 0,
  };

  if (!options?.processImmediately) {
    return { enqueued, dispatch: aggregate };
  }

  const passes = options.maxPasses ?? 3;
  for (let pass = 0; pass < passes; pass += 1) {
    const result = await processWebhookQueue();
    aggregate.processed += result.processed;
    aggregate.delivered += result.delivered;
    aggregate.retried += result.retried;
    aggregate.dead += result.dead;
    if (result.processed === 0) break;
  }

  return { enqueued, dispatch: aggregate };
}
