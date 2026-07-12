import { requireUser } from "../_auth.js";
import { dbAll, getDb, handleOptions, json, nowMs } from "../_db.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "GET") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });
  const uid = user.uid;
  const now = nowMs();
  const rows = await dbAll(
    db,
    `SELECT i.id, i.from_uid, i.team_data, i.expires_at, u.username, s.name
     FROM pvp_invites i
     LEFT JOIN users u ON u.uid = i.from_uid
     LEFT JOIN scores s ON s.uid = i.from_uid
     WHERE i.to_uid = ? AND i.status = 'pending' AND i.expires_at > ?
     ORDER BY i.created_at DESC
     LIMIT 50`,
    [uid, now]
  );

  return json(
    {
      invites: rows.map((r) => {
        let team_data = [];
        try {
          team_data = JSON.parse(r.team_data || "[]");
        } catch {
        }
        return {
          id: Number(r.id),
          from_uid: r.from_uid,
          from_name: r.username || r.name || r.from_uid,
          team_data: Array.isArray(team_data) ? team_data : [],
          expires_at: Number(r.expires_at) || 0,
        };
      }),
    },
    { req }
  );
}
