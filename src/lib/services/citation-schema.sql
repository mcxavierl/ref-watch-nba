CREATE TABLE IF NOT EXISTS citation_events (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  ref_crew TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_citation_events_created ON citation_events(created_at);
CREATE INDEX IF NOT EXISTS idx_citation_events_game ON citation_events(game_id, created_at);
