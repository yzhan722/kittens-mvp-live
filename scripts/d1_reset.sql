-- kittens-mvp D1 Schema v2 (wipe + recreate)
-- WARNING: DROP destroys all data. Run only after explicit wipe approval.

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS achievement_likes;
DROP TABLE IF EXISTS achievement_shares;
DROP TABLE IF EXISTS pvp_battles;
DROP TABLE IF EXISTS pvp_invites;
DROP TABLE IF EXISTS friend_messages;
DROP TABLE IF EXISTS gift_history;
DROP TABLE IF EXISTS friend_requests;
DROP TABLE IF EXISTS friends;
DROP TABLE IF EXISTS daily_tasks_progress;
DROP TABLE IF EXISTS server_boss_claims;
DROP TABLE IF EXISTS server_boss_state;
DROP TABLE IF EXISTS server_buff_contrib;
DROP TABLE IF EXISTS server_buffs;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS scores;
DROP TABLE IF EXISTS saves;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE saves (
  user_id INTEGER NOT NULL,
  slot INTEGER NOT NULL,
  save_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, slot),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_saves_user ON saves(user_id);

CREATE TABLE scores (
  uid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dexCount INTEGER NOT NULL DEFAULT 0,
  power INTEGER NOT NULL DEFAULT 0,
  totalPower INTEGER NOT NULL DEFAULT 0,
  hatchCount INTEGER NOT NULL DEFAULT 0,
  shinyCount INTEGER NOT NULL DEFAULT 0,
  gatherClicks INTEGER NOT NULL DEFAULT 0,
  resourceProduced INTEGER NOT NULL DEFAULT 0,
  catchCount INTEGER NOT NULL DEFAULT 0,
  updatedAt INTEGER NOT NULL,
  gameVersion TEXT,
  topMonsJson TEXT,
  avatarDataUrl TEXT,
  profile_json TEXT
);

CREATE INDEX idx_scores_power ON scores(power DESC);
CREATE INDEX idx_scores_total_power ON scores(totalPower DESC);
CREATE INDEX idx_scores_dex ON scores(dexCount DESC);
CREATE INDEX idx_scores_catch ON scores(catchCount DESC);
CREATE INDEX idx_scores_hatch ON scores(hatchCount DESC);
CREATE INDEX idx_scores_shiny ON scores(shinyCount DESC);
CREATE INDEX idx_scores_gather ON scores(gatherClicks DESC);
CREATE INDEX idx_scores_resource ON scores(resourceProduced DESC);
CREATE INDEX idx_scores_power_updated ON scores(updatedAt, power DESC);
CREATE INDEX idx_scores_total_power_updated ON scores(updatedAt, totalPower DESC);
CREATE INDEX idx_scores_dex_updated ON scores(updatedAt, dexCount DESC);
CREATE INDEX idx_scores_catch_updated ON scores(updatedAt, catchCount DESC);
CREATE INDEX idx_scores_hatch_updated ON scores(updatedAt, hatchCount DESC);
CREATE INDEX idx_scores_shiny_updated ON scores(updatedAt, shinyCount DESC);
CREATE INDEX idx_scores_gather_updated ON scores(updatedAt, gatherClicks DESC);
CREATE INDEX idx_scores_resource_updated ON scores(updatedAt, resourceProduced DESC);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  type TEXT NOT NULL,
  uid TEXT,
  name TEXT,
  msg TEXT NOT NULL
);
CREATE INDEX idx_events_id_desc ON events(id DESC);
CREATE INDEX idx_events_ts ON events(ts DESC);

CREATE TABLE server_buffs (
  key TEXT PRIMARY KEY,
  remainingSec INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE server_buff_contrib (
  key TEXT NOT NULL,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  sec INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  PRIMARY KEY(key, uid)
);

CREATE TABLE server_boss_state (
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

CREATE TABLE server_boss_claims (
  key TEXT NOT NULL,
  killSeq INTEGER NOT NULL,
  uid TEXT NOT NULL,
  claimedAt INTEGER NOT NULL,
  PRIMARY KEY(key, killSeq, uid)
);

INSERT INTO server_boss_state(key, hp, maxHp, killSeq, updatedAt, lastKillAt, rewardType, rewardQty, rewardJson)
VALUES('bully', 1000, 1000, 0, 0, 0, NULL, NULL, NULL);

CREATE TABLE friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid1 TEXT NOT NULL,
  uid2 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(uid1, uid2)
);
CREATE INDEX idx_friends_uid1 ON friends(uid1);
CREATE INDEX idx_friends_uid2 ON friends(uid2);

CREATE TABLE friend_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_uid TEXT NOT NULL,
  to_uid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_friend_requests_to_uid ON friend_requests(to_uid);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);

CREATE TABLE gift_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_uid TEXT NOT NULL,
  to_uid TEXT NOT NULL,
  item_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_gift_history_to_uid ON gift_history(to_uid);

CREATE TABLE friend_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_uid TEXT NOT NULL,
  to_uid TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_friend_messages_to_uid ON friend_messages(to_uid);

CREATE TABLE pvp_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_uid TEXT NOT NULL,
  to_uid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  team_data TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_pvp_invites_to_uid ON pvp_invites(to_uid);

CREATE TABLE pvp_battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invite_id INTEGER NOT NULL,
  player1_uid TEXT NOT NULL,
  player2_uid TEXT NOT NULL,
  winner_uid TEXT,
  battle_log TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE achievement_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_data TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_achievement_shares_created_at ON achievement_shares(created_at DESC);

CREATE TABLE achievement_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  achievement_id INTEGER NOT NULL,
  uid TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(achievement_id, uid)
);

CREATE TABLE daily_tasks_progress (
  uid TEXT NOT NULL,
  date TEXT NOT NULL,
  progress_json TEXT NOT NULL DEFAULT '{}',
  claimed INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(uid, date)
);
