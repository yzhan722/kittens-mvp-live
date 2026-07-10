import { dbAll, dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../../_db.js";
import { clampStr, clampUid, intOr } from "../../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;

  const db = getDb(context.env);
  const url = new URL(req.url);
  const uid = clampUid(url.searchParams.get("uid") || "");
  if (!uid) return json({ error: "uid required" }, { status: 400, req });

  if (req.method === "GET") {
    const rows = await dbAll(
      db,
      `SELECT m.id, m.from_uid, m.message, m.read, m.created_at,
              u.username AS from_name, s.name AS score_name
       FROM friend_messages m
       LEFT JOIN users u ON u.uid = m.from_uid
       LEFT JOIN scores s ON s.uid = m.from_uid
       WHERE m.to_uid = ?
       ORDER BY m.created_at DESC
       LIMIT 100`,
      [uid]
    );
    return json(
      {
        messages: rows.map((m) => ({
          id: Number(m.id),
          from_uid: m.from_uid,
          from_name: m.from_name || m.score_name || m.from_uid,
          message: m.message,
          read: Number(m.read) || 0,
          created_at: Number(m.created_at) || 0,
        })),
      },
      { req }
    );
  }

  if (req.method === "POST") {
    const body = await readJson(req);
    const toUid = clampUid(body?.toUid);
    const message = clampStr(body?.message, 500);
    if (!toUid || !message) return json({ error: "bad request" }, { req });
    await dbRun(
      db,
      "INSERT INTO friend_messages(from_uid, to_uid, message, read, created_at) VALUES(?, ?, ?, 0, ?)",
      [uid, toUid, message, nowMs()]
    );
    return json({ ok: true }, { req });
  }

  if (req.method === "PUT") {
    const body = await readJson(req);
    const messageId = intOr(body?.messageId, 0);
    if (!messageId) return json({ error: "bad request" }, { req });
    await dbRun(db, "UPDATE friend_messages SET read = 1 WHERE id = ? AND to_uid = ?", [messageId, uid]);
    return json({ ok: true }, { req });
  }

  return json({ error: "method not allowed" }, { status: 405, req });
}
