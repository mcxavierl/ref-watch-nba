# Enterprise webhooks

Ref Watch signs outbound anomaly webhooks with timestamped HMAC signatures and stores subscriber secrets sealed at rest.

## Verifying signatures

Subscribers should verify every delivery before processing the payload.

```ts
import { verifyWebhookSignature } from "@/lib/services/webhookSignature";

const result = verifyWebhookSignature({
  secret: process.env.REFWATCH_WEBHOOK_SECRET!,
  payload: rawBody,
  signature: request.headers.get("X-RefWatch-Signature") ?? "",
  timestamp: request.headers.get("X-RefWatch-Timestamp") ?? "",
});

if (!result.ok) {
  return new Response(result.reason, { status: 401 });
}
```

Headers sent on each delivery:

| Header | Description |
|--------|-------------|
| `X-RefWatch-Signature` | `sha256=<hmac>` over `${timestamp}.${payload}` |
| `X-RefWatch-Timestamp` | Unix timestamp (seconds) used in the signature |
| `x-refwatch-event` | Event type, e.g. `ANOMALY_DETECTED` |

Signatures older than 5 minutes are rejected to block replay attacks.

## Seeding subscribers

```bash
REFWATCH_WEBHOOK_URL=https://example.com/hooks/refwatch \
REFWATCH_WEBHOOK_SECRET=your-secret \
REFWATCH_WEBHOOK_MASTER_KEY=your-master-key \
npx tsx scripts/seed-webhook-subscribers.ts
```

Secrets are sealed in SQLite/JSON storage. Set `REFWATCH_WEBHOOK_MASTER_KEY` in every environment that dispatches webhooks.

## Retry policy

Failed deliveries retry on a fixed schedule: 0s, 30s, 2m, 10m, 1h (`WEBHOOK_MAX_ATTEMPTS = 5`).
