-- kittens-mvp D1 数据库 Schema
-- 已清理历史 ALTER TABLE（字段已存在于生产库），仅保留建表语句和索引

CREATE TABLE IF NOT EXISTS scores (
  uid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dexCount INTEGER NOT NULL,
  power INTEGER NOT NULL,
  totalPower INTEGER NOT NULL DEFAULT 0,
  hatchCount INTEGER NOT NULL DEFAULT 0,
  shinyCount INTEGER NOT NULL DEFAULT 0,
  gatherClicks INTEGER NOT NULL DEFAULT 0,
  resourceProduced INTEGER NOT NULL DEFAULT 0,
  catchCount INTEGER NOT NULL DEFAULT 0,
  updatedAt INTEGER NOT NULL,
  gameVersion TEXT,
  topMonsJson TEXT,
  avatarDataUrl TEXT
);

-- 排行榜高频查询索引
CREATE INDEX IF NOT EXISTS idx_scores_power ON scores(power DESC);
CREATE INDEX IF NOT EXISTS idx_scores_total_power ON scores(totalPower DESC);
CREATE INDEX IF NOT EXISTS idx_scores_dex ON scores(dexCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_catch ON scores(catchCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_hatch ON scores(hatchCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_shiny ON scores(shinyCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_gather ON scores(gatherClicks DESC);
CREATE INDEX IF NOT EXISTS idx_scores_resource ON scores(resourceProduced DESC);

-- 排行榜复合索引（WHERE updatedAt > ? ORDER BY column DESC）
CREATE INDEX IF NOT EXISTS idx_scores_total_power_updated ON scores(updatedAt, totalPower DESC);
CREATE INDEX IF NOT EXISTS idx_scores_power_updated ON scores(updatedAt, power DESC);
CREATE INDEX IF NOT EXISTS idx_scores_dex_updated ON scores(updatedAt, dexCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_catch_updated ON scores(updatedAt, catchCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_hatch_updated ON scores(updatedAt, hatchCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_shiny_updated ON scores(updatedAt, shinyCount DESC);
CREATE INDEX IF NOT EXISTS idx_scores_gather_updated ON scores(updatedAt, gatherClicks DESC);
CREATE INDEX IF NOT EXISTS idx_scores_resource_updated ON scores(updatedAt, resourceProduced DESC);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  type TEXT NOT NULL,
  uid TEXT,
  name TEXT,
  msg TEXT NOT NULL
);

-- Ticker 拉取高频查询索引
CREATE INDEX IF NOT EXISTS idx_events_id_desc ON events(id DESC);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts DESC);

CREATE TABLE IF NOT EXISTS server_buffs (
  key TEXT PRIMARY KEY,
  remainingSec INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS server_buff_contrib (
  key TEXT NOT NULL,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  sec INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  PRIMARY KEY(key, uid)
);

CREATE TABLE IF NOT EXISTS server_boss_state (
  key TEXT PRIMARY KEY,
  hp INTEGER NOT NULL,
  maxHp INTEGER NOT NULL,
  killSeq INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  lastKillAt INTEGER NOT NULL,
  rewardType TEXT,
  rewardQty INTEGER,
  rewardJson TEXT
);

CREATE TABLE IF NOT EXISTS server_boss_claims (
  key TEXT NOT NULL,
  killSeq INTEGER NOT NULL,
  uid TEXT NOT NULL,
  claimedAt INTEGER NOT NULL,
  PRIMARY KEY(key, killSeq, uid)
);

INSERT OR IGNORE INTO server_boss_state(key, hp, maxHp, killSeq, updatedAt, lastKillAt, rewardType, rewardQty, rewardJson)
VALUES('bully', 1000, 1000, 0, 0, 0, NULL, NULL, NULL);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- sessions 按 user_id 查询索引
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS saves (
  user_id INTEGER NOT NULL,
  slot INTEGER NOT NULL,
  save_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, slot)
);

-- saves 按 user_id 查询索引
CREATE INDEX IF NOT EXISTS idx_saves_user ON saves(user_id);
