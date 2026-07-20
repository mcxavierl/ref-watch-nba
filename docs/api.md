# Ref Watch Data API (v1)

High-performance, read-only access to Ref Watch officiating analytics. Built for sportsbooks, media, and quant teams that need programmatic crew signals without scraping the website.

## Base URL

```
https://refwatch.ca/api/v1
```

## Authentication

Every data endpoint requires an API key.

```http
GET /api/v1/leagues/nba/stats HTTP/1.1
Host: refwatch.ca
x-api-key: rw_live_your_key_here
```

Bearer tokens are also supported:

```http
Authorization: Bearer rw_live_your_key_here
```

Unauthenticated requests receive `401` with `{ "error": { "code": "missing_api_key", ... } }`.

## Rate limits

Limits are enforced per subscription tier:

| Tier | Quota | Use case |
|------|-------|----------|
| **FREE** | 50 requests / day | Evaluation and developer onboarding |
| **DEVELOPER** | 10,000 requests / month | Production integrations |
| **ENTERPRISE** | Unlimited (custom) | High-volume or SLA-backed deployments |

Rate limit headers on every authenticated response:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset` (Unix ms)
- `X-RefWatch-Tier`

When exceeded, the API returns `429 rate_limit_exceeded`.

## Getting an API key

1. Email [partners@refwatch.ca](mailto:partners@refwatch.ca) with your use case and expected volume.
2. We provision a row in the `subscriptions` table (tier + hashed key).
3. You receive a single-use secret (store it immediately; we only persist the hash).

For local development, set `API_V1_SUBSCRIPTIONS_JSON` in `.env.local`:

```json
[
  { "key": "rw_dev_free", "tier": "FREE" },
  { "key": "rw_dev_pro", "tier": "DEVELOPER" }
]
```

## Endpoints

### `GET /api/v1`

Public catalog of version, tiers, and available routes. No API key required.

### `GET /api/v1/health`

Liveness probe for uptime monitors. No API key required.

### `GET /api/v1/leagues/{league}/stats`

League-level metadata and baselines.

**Path parameters**

- `league` - `nba`, `nhl`, `nfl`, `epl`, `laliga`, `cbb`, `cfb`, `wnba`

**Example**

```bash
curl -s \
  -H "x-api-key: $REFWATCH_API_KEY" \
  "https://refwatch.ca/api/v1/leagues/nba/stats"
```

### `GET /api/v1/leagues/{league}/refs`

Official index with core crew metrics (games, scoring delta, foul delta, over rate).

**Query parameters**

- `limit` (optional, default `100`, max `500`)

**Example**

```bash
curl -s \
  -H "x-api-key: $REFWATCH_API_KEY" \
  "https://refwatch.ca/api/v1/leagues/nfl/refs?limit=25"
```

## Website vs API

The Ref Watch website (SSR/RSC) reads the same JSON cache internally via server modules. It does **not** call `/api/v1` and does **not** require keys. Only external programmatic clients hit the gateway.

## Errors

Structured error body:

```json
{
  "error": {
    "code": "invalid_api_key",
    "message": "The API key is invalid or expired."
  }
}
```

Common codes: `missing_api_key`, `invalid_api_key`, `subscription_inactive`, `rate_limit_exceeded`, `league_not_found`.

## Changelog

- **v1 (initial)** - Gateway, tiered rate limits, league stats + refs index.
