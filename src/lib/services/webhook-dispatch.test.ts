import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import {
  computeWebhookBackoffMs,
  processWebhookQueue,
} from "@/lib/services/webhookDispatch";
import type { WebhookQueueJob, WebhookSubscriber, WebhookStore } from "@/lib/services/webhookQueue";

type MemoryWebhookStore = {
  subscribers: WebhookSubscriber[];
  queue: WebhookQueueJob[];
  deliveryLogs: Array<{
    queueId: string;
    subscriberId: string;
    clientId: string;
    statusCode: number | null;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
  }>;
};

function createMemoryStore(subscriber: WebhookSubscriber): WebhookStore {
  const store: MemoryWebhookStore = {
    subscribers: [subscriber],
    queue: [],
    deliveryLogs: [],
  };

  return {
    ...store,
    async listActiveSubscribers() {
      return store.subscribers.filter((row) => row.active);
    },
    async upsertSubscriber(input) {
      const next = { ...input, createdAt: input.createdAt ?? new Date().toISOString() };
      store.subscribers.push(next);
      return next;
    },
    async enqueueJob(input) {
      const now = new Date().toISOString();
      const job: WebhookQueueJob = {
        id: randomUUID(),
        subscriberId: input.subscriberId,
        clientId: input.clientId,
        payload: input.payload,
        status: "pending",
        attemptCount: 0,
        maxAttempts: input.maxAttempts ?? 6,
        nextAttemptAt: now,
        lastError: null,
        createdAt: now,
        deliveredAt: null,
      };
      store.queue.push(job);
      return job;
    },
    async claimDueJobs(limit, nowIso) {
      const due = store.queue
        .filter(
          (job) =>
            (job.status === "pending" || job.status === "failed") &&
            job.nextAttemptAt <= nowIso,
        )
        .slice(0, limit)
        .map((job) => ({ ...job, status: "processing" as const }));
      for (const job of due) {
        const index = store.queue.findIndex((row) => row.id === job.id);
        if (index >= 0) store.queue[index] = job;
      }
      return due;
    },
    async markDelivered(jobId, deliveredAt) {
      const job = store.queue.find((row) => row.id === jobId);
      if (!job) return;
      job.status = "delivered";
      job.deliveredAt = deliveredAt;
      job.lastError = null;
    },
    async markRetry(job, error, nextAttemptAt) {
      const index = store.queue.findIndex((row) => row.id === job.id);
      if (index < 0) return;
      store.queue[index] = {
        ...job,
        status: "failed",
        lastError: error,
        nextAttemptAt,
      };
    },
    async markDead(jobId, error) {
      const job = store.queue.find((row) => row.id === jobId);
      if (!job) return;
      job.status = "dead";
      job.lastError = error;
    },
    async logDelivery(input) {
      store.deliveryLogs.push(input);
    },
    async logWebhookEvent() {
      /* no-op for memory store */
    },
  };
}

describe("webhook dispatch queue", () => {
  it("retries failed deliveries with exponential backoff before marking dead", async () => {
    const subscriber: WebhookSubscriber = {
      id: "sub_test",
      clientId: "client_test",
      label: "Test",
      url: "https://example.test/webhook",
      secret: "secret",
      active: true,
      eventKinds: ["ANOMALY_DETECTED"],
      createdAt: new Date().toISOString(),
    };
    const store = createMemoryStore(subscriber);
    const memoryStore = store as WebhookStore & { queue: WebhookQueueJob[] };
    const now = new Date().toISOString();
    const job: WebhookQueueJob = {
      id: randomUUID(),
      subscriberId: subscriber.id,
      clientId: subscriber.clientId,
      payload: JSON.stringify({
        event: "ANOMALY_DETECTED",
        timestamp: now,
        gameId: "g1",
        severity: "HIGH",
        evidence: {},
      }),
      status: "pending",
      attemptCount: 0,
      maxAttempts: 3,
      nextAttemptAt: now,
      lastError: null,
      createdAt: now,
      deliveredAt: null,
    };
    memoryStore.queue.push(job);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      ({
        ok: false,
        status: 503,
      }) as Response;

    try {
      const firstPass = await processWebhookQueue({ store, now: new Date() });
      assert.equal(firstPass.processed, 1);
      assert.equal(firstPass.retried, 1);
      assert.equal(memoryStore.queue[0]?.status, "failed");
      assert.equal(memoryStore.queue[0]?.attemptCount, 1);
      assert.ok(memoryStore.queue[0]?.nextAttemptAt);

      const retryAt = new Date(memoryStore.queue[0]!.nextAttemptAt).getTime();
      const expectedDelay = computeWebhookBackoffMs(1);
      assert.ok(retryAt >= Date.now() + expectedDelay - 2_000);

      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 200,
        }) as Response;

      const secondPass = await processWebhookQueue({
        store,
        now: new Date(retryAt + 1_000),
      });
      assert.equal(secondPass.delivered, 1);
      assert.equal(memoryStore.queue[0]?.status, "delivered");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
