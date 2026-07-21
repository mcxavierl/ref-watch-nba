CREATE TABLE IF NOT EXISTS webhook_subscribers (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  event_kinds TEXT NOT NULL DEFAULT '["ANOMALY_DETECTED"]',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscribers_client ON webhook_subscribers(client_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscribers_active ON webhook_subscribers(active);

CREATE TABLE IF NOT EXISTS webhook_queue (
  id TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL,
  delivered_at TEXT,
  FOREIGN KEY (subscriber_id) REFERENCES webhook_subscribers(id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_queue_status_next ON webhook_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_subscriber ON webhook_queue(subscriber_id, created_at);

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_id TEXT NOT NULL,
  subscriber_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  status_code INTEGER,
  latency_ms INTEGER NOT NULL,
  success INTEGER NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_subscriber ON webhook_delivery_logs(subscriber_id, created_at);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  queue_id TEXT,
  response_code INTEGER,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  payload_excerpt TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (subscriber_id) REFERENCES webhook_subscribers(id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_subscriber ON webhook_events(subscriber_id, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status, created_at);
