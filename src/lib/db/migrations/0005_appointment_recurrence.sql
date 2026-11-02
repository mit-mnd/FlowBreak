ALTER TABLE appointments ADD COLUMN repeat TEXT NOT NULL DEFAULT 'none';
ALTER TABLE appointments ADD COLUMN repeat_until INTEGER;
ALTER TABLE appointments ADD COLUMN series_start INTEGER;
