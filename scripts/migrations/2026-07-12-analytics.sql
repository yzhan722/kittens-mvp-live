-- Additive migration: onboarding / ops analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  event TEXT NOT NULL,
  uid TEXT,
  session_id TEXT,
  props_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_ts ON analytics_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_ts ON analytics_events(event, ts DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_uid_ts ON analytics_events(uid, ts DESC);
