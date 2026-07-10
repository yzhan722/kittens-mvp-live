-- 社交功能扩展

-- 好友留言表
CREATE TABLE IF NOT EXISTS friend_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_uid TEXT NOT NULL,
  to_uid TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_friend_messages_to_uid ON friend_messages(to_uid);
CREATE INDEX IF NOT EXISTS idx_friend_messages_read ON friend_messages(read);
CREATE INDEX IF NOT EXISTS idx_friend_messages_created_at ON friend_messages(created_at);

-- PVP 对战邀请表
CREATE TABLE IF NOT EXISTS pvp_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_uid TEXT NOT NULL,
  to_uid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, expired
  team_data TEXT, -- JSON: 发起者的队伍数据
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pvp_invites_to_uid ON pvp_invites(to_uid);
CREATE INDEX IF NOT EXISTS idx_pvp_invites_status ON pvp_invites(status);
CREATE INDEX IF NOT EXISTS idx_pvp_invites_expires_at ON pvp_invites(expires_at);

-- PVP 对战记录表
CREATE TABLE IF NOT EXISTS pvp_battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invite_id INTEGER NOT NULL,
  player1_uid TEXT NOT NULL,
  player2_uid TEXT NOT NULL,
  winner_uid TEXT,
  battle_log TEXT, -- JSON: 战斗日志
  created_at INTEGER NOT NULL,
  FOREIGN KEY (invite_id) REFERENCES pvp_invites(id)
);

CREATE INDEX IF NOT EXISTS idx_pvp_battles_player1 ON pvp_battles(player1_uid);
CREATE INDEX IF NOT EXISTS idx_pvp_battles_player2 ON pvp_battles(player2_uid);
CREATE INDEX IF NOT EXISTS idx_pvp_battles_created_at ON pvp_battles(created_at);

-- 成就分享表
CREATE TABLE IF NOT EXISTS achievement_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  achievement_type TEXT NOT NULL, -- rare_catch, dex_milestone, level_milestone, etc.
  achievement_data TEXT NOT NULL, -- JSON: 成就详情
  likes INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_achievement_shares_uid ON achievement_shares(uid);
CREATE INDEX IF NOT EXISTS idx_achievement_shares_created_at ON achievement_shares(created_at);

-- 成就点赞表
CREATE TABLE IF NOT EXISTS achievement_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  achievement_id INTEGER NOT NULL,
  uid TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(achievement_id, uid),
  FOREIGN KEY (achievement_id) REFERENCES achievement_shares(id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_likes_achievement ON achievement_likes(achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievement_likes_uid ON achievement_likes(uid);
