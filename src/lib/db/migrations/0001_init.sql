CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  position REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS water_logs (
  id TEXT PRIMARY KEY NOT NULL,
  amount_ml INTEGER NOT NULL,
  logged_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_water_logs_logged_at ON water_logs (logged_at);

CREATE TABLE IF NOT EXISTS movement_logs (
  id TEXT PRIMARY KEY NOT NULL,
  exercise_id TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  logged_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_movement_logs_logged_at ON movement_logs (logged_at);
