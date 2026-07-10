import { dbAll, dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { clampStr, clampUid, intOr } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;

  const db = getDb(context.env);
  const url = new URL(req.url);
  const uid = clampUid(url.searchParams.get("uid") || "");

  if (req.method === "GET") {
    const rows = await dbAll(
      db,
      `SELECT a.id, a.uid, a.achievement_type, a.achievement_data, a.likes, a.created_at,
              u.username, s.name
       FROM achievement_shares a
       LEFT JOIN users u ON u.uid = a.uid
       LEFT JOIN scores s ON s.uid = a.uid
       ORDER BY a.created_at DESC
       LIMIT 50`
    );
    return json(
      {
        achievements: rows.map((a) => {
          let achievement_data = {};
          try {
            achievement_data = JSON.parse(a.achievement_data || "{}");
          } catch {
          }
          return {
            id: Number(a.id),
            uid: a.uid,
            username: a.username || a.name || a.uid,
            achievement_type: a.achievement_type,
            achievement_data,
            likes: Number(a.likes) || 0,
            created_at: Number(a.created_at) || 0,
          };
        }),
      },
      { req }
    );
  }

  if (req.method === "POST") {
    if (!uid) return json({ error: "uid required" }, { status: 400, req });
    const body = await readJson(req);
    const achievementType = clampStr(body?.achievementType, 64);
    const achievementData = body?.achievementData && typeof body.achievementData === "object" ? body.achievementData : {};
    if (!achievementType) return json({ error: "bad request" }, { req });
    await dbRun(
      db,
      "INSERT INTO achievement_shares(uid, achievement_type, achievement_data, likes, created_at) VALUES(?, ?, ?, 0, ?)",
      [uid, achievementType, JSON.stringify(achievementData), nowMs()]
    );
    return json({ ok: true }, { req });
  }

  if (req.method === "PUT") {
    if (!uid) return json({ error: "uid required" }, { status: 400, req });
    const body = await readJson(req);
    const achievementId = intOr(body?.achievementId, 0);
    if (!achievementId) return json({ error: "bad request" }, { req });

    const exists = await dbFirst(db, "SELECT id FROM achievement_shares WHERE id = ?", [achievementId]);
    if (!exists) return json({ error: "not found" }, { status: 404, req });

    const liked = await dbFirst(
      db,
      "SELECT id FROM achievement_likes WHERE achievement_id = ? AND uid = ?",
      [achievementId, uid]
    );
    if (liked) return json({ error: "already liked" }, { req });

    await dbRun(db, "INSERT INTO achievement_likes(achievement_id, uid, created_at) VALUES(?, ?, ?)", [
      achievementId,
      uid,
      nowMs(),
    ]);
    await dbRun(db, "UPDATE achievement_shares SET likes = likes + 1 WHERE id = ?", [achievementId]);
    return json({ ok: true }, { req });
  }

  return json({ error: "method not allowed" }, { status: 405, req });
}
