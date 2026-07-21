import type { WebhookQueueJob } from "@/lib/services/webhookQueue";
import {
  enqueueAnomalyWebhookEvents,
  getWebhookStore,
  signWebhookPayload,
  type WebhookStore,
} from "@/lib/services/webhookQueue";
import type { AnomalyDetectedEvent } from "@/lib/services/anomalyMonitor";

export type WebhookDispatchSummary = {
  enqueued: number;
  processed: number;
  delivered: number;
  retried: number;
  dead: number;
};

const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 300_000;
const DEFAULT_BATCH_SIZE = 25;

export function computeWebhookBackoffMs(attemptCount: number): number {
  const delay = BASE_BACKOFF_MS * 2 ** attemptCount;
  return Math.min(delay, MAX_BACKOFF_MS);
}

async function deliverWebhookJob(
  job: WebhookQueueJob,
  url: string,
  secret: string,
): Promise<{ ok: boolean; statusCode: number | null; error?: string; latencyMs: number }> {
  const startedAt = Date.now();
  try {
    const signature = signWebhookPayload(secret, job.payload);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-refwatch-event": "ANOMALY_DETECTED",
        "x-refwatch-signature": signature,
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
  const jobs = await store.claimDueJobs(options?.batchSize ?? DEFAULT_BATCH_SIZE, nowIso);

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
    if (!subscriber || !subscriber.active) {
      await store.markDead(job.id, "Subscriber inactive or missing");
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
      summary.delivered += 1;
      continue;
    }

    const nextAttemptCount = job.attemptCount + 1;
    if (nextAttemptCount >= job.maxAttempts) {
      await store.markDead(job.id, result.error ?? "Delivery failed");
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
  const enqueued = await enqueueAnomalyWebhookEvents(events);
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
