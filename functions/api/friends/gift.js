import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { clampStr, clampUid, intOr } from "../_uid.js";

const GIFT_DAILY_GIVER = 10;
const GIFT_DAILY_PAIR = 3;
const DAY_MS = 86_400_000;

function utcDayStartMs(now) {
  return now - (now % DAY_MS);
}

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });
  const fromUid = user.uid;

  const body = await readJson(req);
  const toUid = clampUid(body?.toUid);
  const itemType = clampStr(body?.itemType, 64);
  const quantity = Math.max(1, intOr(body?.quantity, 1));
  if (!toUid || !itemType) return json({ error: "bad request" }, { status: 400, req });

  const friendship = await dbFirst(
    db,
    `SELECT id FROM friends WHERE (uid1 = ? AND uid2 = ?) OR (uid1 = ? AND uid2 = ?)`,
    [fromUid, toUid, toUid, fromUid]
  );
  if (!friendship) return json({ error: "not friends" }, { req });

  const dayStart = utcDayStartMs(nowMs());

  const giverRow = await dbFirst(
    db,
    "SELECT COUNT(*) AS c FROM gift_history WHERE from_uid = ? AND created_at >= ?",
    [fromUid, dayStart]
  );
  if (Number(giverRow?.c) >= GIFT_DAILY_GIVER) {
    return json(
      { error: "gift daily limit", message: "今日赠送次数已达上限（10次），明天再来吧" },
      { status: 429, req }
    );
  }

  const pairRow = await dbFirst(
    db,
    "SELECT COUNT(*) AS c FROM gift_history WHERE from_uid = ? AND to_uid = ? AND created_at >= ?",
    [fromUid, toUid, dayStart]
  );
  if (Number(pairRow?.c) >= GIFT_DAILY_PAIR) {
    return json(
      { error: "gift pair limit", message: "今天给这位好友的赠送已达上限（3次），换个好友或明天再试" },
      { status: 429, req }
    );
  }

  await dbRun(
    db,
    "INSERT INTO gift_history(from_uid, to_uid, item_type, quantity, created_at) VALUES(?, ?, ?, ?, ?)",
    [fromUid, toUid, itemType, quantity, nowMs()]
  );
  return json({ success: true }, { req });
}
