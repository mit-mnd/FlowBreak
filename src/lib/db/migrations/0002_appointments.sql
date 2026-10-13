CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  starts_at INTEGER NOT NULL,
  remind_before_min INTEGER NOT NULL DEFAULT 10,
  done INTEGER NOT NULL DEFAULT 0,
  notified_at INTEGER,
  snoozed_until INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON appointments (starts_at);
