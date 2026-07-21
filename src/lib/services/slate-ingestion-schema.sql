CREATE TABLE IF NOT EXISTS slate_ingestion_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  games_updated INTEGER NOT NULL,
  crews_assigned_count INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  projections_written INTEGER NOT NULL DEFAULT 0,
  steps_completed TEXT NOT NULL DEFAULT '[]',
  steps_failed TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_slate_ingestion_logs_timestamp
  ON slate_ingestion_logs(timestamp DESC);
