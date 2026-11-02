CREATE TABLE IF NOT EXISTS reminder_events (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  shown_at INTEGER NOT NULL,
  outcome TEXT,
  resolved_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_reminder_events_shown_at ON reminder_events (shown_at);
