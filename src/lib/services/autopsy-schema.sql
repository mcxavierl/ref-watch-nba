CREATE TABLE IF NOT EXISTS autopsy_records (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  league_id TEXT NOT NULL,
  official_slugs TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  season TEXT NOT NULL,
  actual_fouls REAL NOT NULL,
  expected_fouls REAL NOT NULL,
  delta REAL NOT NULL,
  rarity_percentile REAL NOT NULL,
  attribution_crew_pct REAL NOT NULL,
  attribution_style_pct REAL NOT NULL,
  attribution_gamestate_pct REAL NOT NULL,
  summary_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_autopsy_records_game_id
  ON autopsy_records(game_id);

CREATE INDEX IF NOT EXISTS idx_autopsy_records_created_at
  ON autopsy_records(created_at DESC);

CREATE TABLE IF NOT EXISTS ref_team_history (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  official_slug TEXT NOT NULL,
  team_abbr TEXT NOT NULL,
  games INTEGER NOT NULL,
  win_rate REAL NOT NULL,
  avg_foul_differential REAL NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ref_team_history_official
  ON ref_team_history(league_id, official_slug);
