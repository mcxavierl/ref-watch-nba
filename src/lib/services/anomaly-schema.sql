CREATE TABLE IF NOT EXISTS anomaly_evidence_store (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  anomaly_type TEXT NOT NULL,
  severity_score INTEGER NOT NULL,
  severity_level TEXT NOT NULL,
  z_score REAL NOT NULL,
  rolling_window_used TEXT NOT NULL,
  evidence_payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_anomaly_evidence_game ON anomaly_evidence_store(game_id, created_at);
CREATE INDEX IF NOT EXISTS idx_anomaly_evidence_type ON anomaly_evidence_store(anomaly_type, created_at);
CREATE INDEX IF NOT EXISTS idx_anomaly_evidence_severity ON anomaly_evidence_store(severity_level, created_at);
