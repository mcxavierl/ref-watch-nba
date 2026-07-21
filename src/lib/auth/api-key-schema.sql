CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  label TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('standard', 'enterprise')),
  key_hash TEXT NOT NULL UNIQUE,
  request_count INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_client_id ON api_keys(client_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);

CREATE TABLE IF NOT EXISTS api_usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_key_created ON api_usage_logs(api_key_id, created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_client_created ON api_usage_logs(client_id, created_at);
