-- Ref Watch API v1 subscription store (Cloudflare D1)
-- Apply: wrangler d1 execute refwatch-api --file=schema/subscriptions.sql

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  api_key_hash TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('FREE', 'DEVELOPER', 'ENTERPRISE')),
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions (tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);

-- Example seed (replace api_key_hash with SHA-256 of your issued key):
-- INSERT INTO subscriptions (id, api_key_hash, tier, email, status)
-- VALUES (
--   'sub_dev_demo',
--   '<sha256-of-api-key>',
--   'DEVELOPER',
--   'partner@example.com',
--   'active'
-- );
