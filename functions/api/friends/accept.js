import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { intOr } from "../_uid.js";

function pair(a, b) {
  return a < b ? [a, b] : [b, a];
}

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });
  const uid = user.uid;

  const body = await readJson(req);
  const requestId = intOr(body?.requestId, 0);
  if (!requestId) return json({ error: "bad request" }, { status: 400, req });

  const row = await dbFirst(
    db,
    "SELECT id, from_uid, to_uid, status FROM friend_requests WHERE id = ?",
    [requestId]
  );
  if (!row || row.to_uid !== uid || row.status !== "pending") {
    return json({ error: "request not found" }, { req });
  }

  const [uid1, uid2] = pair(row.from_uid, row.to_uid);
  await dbRun(db, "UPDATE friend_requests SET status = 'accepted' WHERE id = ?", [requestId]);
  await dbRun(db, "INSERT OR IGNORE INTO friends(uid1, uid2, created_at) VALUES(?, ?, ?)", [
    uid1,
    uid2,
    nowMs(),
  ]);
  return json({ success: true }, { req });
}
