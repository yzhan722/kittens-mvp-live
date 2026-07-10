-- 好友系统数据库表

-- 好友关系表
CREATE TABLE IF NOT EXISTS friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid1 TEXT NOT NULL,
  uid2 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(uid1, uid2)
);

CREATE INDEX IF NOT EXISTS idx_friends_uid1 ON friends(uid1);
CREATE INDEX IF NOT EXISTS idx_friends_uid2 ON friends(uid2);

-- 好友请求表
CREATE TABLE IF NOT EXISTS friend_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_uid TEXT NOT NULL,
  to_uid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_to_uid ON friend_requests(to_uid);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- 赠送记录表
CREATE TABLE IF NOT EXISTS gift_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_uid TEXT NOT NULL,
  to_uid TEXT NOT NULL,
  item_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gift_history_to_uid ON gift_history(to_uid);
CREATE INDEX IF NOT EXISTS idx_gift_history_created_at ON gift_history(created_at);
