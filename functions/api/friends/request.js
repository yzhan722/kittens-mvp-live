import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { clampStr } from "../_uid.js";

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
  const toUsername = clampStr(body?.toUsername, 32);
  if (!toUsername) return json({ error: "bad request" }, { status: 400, req });

  let toUser = await dbFirst(db, "SELECT uid, username FROM users WHERE username = ?", [toUsername]);
  if (!toUser) {
    const byScore = await dbFirst(db, "SELECT uid, name AS username FROM scores WHERE name = ?", [toUsername]);
    if (byScore) toUser = { uid: byScore.uid, username: byScore.username };
  }
  if (!toUser?.uid) return json({ error: "user not found" }, { req });
  if (toUser.uid === fromUid) return json({ error: "cannot friend self" }, { req });

  const already = await dbFirst(
    db,
    `SELECT id FROM friends WHERE (uid1 = ? AND uid2 = ?) OR (uid1 = ? AND uid2 = ?)`,
    [fromUid, toUser.uid, toUser.uid, fromUid]
  );
  if (already) return json({ error: "already friends" }, { req });

  const pending = await dbFirst(
    db,
    `SELECT id FROM friend_requests WHERE from_uid = ? AND to_uid = ? AND status = 'pending'`,
    [fromUid, toUser.uid]
  );
  if (pending) return json({ error: "request pending" }, { req });

  await dbRun(
    db,
    "INSERT INTO friend_requests(from_uid, to_uid, status, created_at) VALUES(?, ?, 'pending', ?)",
    [fromUid, toUser.uid, nowMs()]
  );
  return json({ success: true }, { req });
}
