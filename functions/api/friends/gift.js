import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { clampStr, clampUid, intOr } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const body = await readJson(req);
  const fromUid = clampUid(body?.fromUid);
  const toUid = clampUid(body?.toUid);
  const itemType = clampStr(body?.itemType, 64);
  const quantity = Math.max(1, intOr(body?.quantity, 1));
  if (!fromUid || !toUid || !itemType) return json({ error: "bad request" }, { status: 400, req });

  const db = getDb(context.env);
  const friendship = await dbFirst(
    db,
    `SELECT id FROM friends WHERE (uid1 = ? AND uid2 = ?) OR (uid1 = ? AND uid2 = ?)`,
    [fromUid, toUid, toUid, fromUid]
  );
  if (!friendship) return json({ error: "not friends" }, { req });

  await dbRun(
    db,
    "INSERT INTO gift_history(from_uid, to_uid, item_type, quantity, created_at) VALUES(?, ?, ?, ?, ?)",
    [fromUid, toUid, itemType, quantity, nowMs()]
  );
  return json({ success: true }, { req });
}
