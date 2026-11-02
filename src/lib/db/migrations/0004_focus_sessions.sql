CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT,
  title TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  planned_min INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions (started_at);
