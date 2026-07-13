import { requireUser } from "../_auth.js";
import { dbAll, dbFirst, getDb, handleOptions, json, nowMs } from "../_db.js";

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
  const url = new URL(req.url);
  const box = String(url.searchParams.get("box") || "in");

  // Inviter polls completed battles (async PvP feedback)
  if (box === "results") {
    const rows = await dbAll(
      db,
      `SELECT b.id, b.invite_id, b.player1_uid, b.player2_uid, b.winner_uid, b.battle_log, b.created_at,
              u.username AS opponent_name, s.name AS opponent_score_name
       FROM pvp_battles b
       LEFT JOIN users u ON u.uid = b.player2_uid
       LEFT JOIN scores s ON s.uid = b.player2_uid
       WHERE b.player1_uid = ?
       ORDER BY b.created_at DESC
       LIMIT 20`,
      [uid]
    );
    return json(
      {
        results: rows.map((r) => {
          let battle_log = [];
          try {
            battle_log = JSON.parse(r.battle_log || "[]");
          } catch {
          }
          return {
            id: Number(r.id),
            invite_id: Number(r.invite_id),
            player1_uid: r.player1_uid,
            player2_uid: r.player2_uid,
            winner_uid: r.winner_uid || null,
            opponent_name: r.opponent_name || r.opponent_score_name || r.player2_uid,
            battle_log: Array.isArray(battle_log) ? battle_log : [],
            created_at: Number(r.created_at) || 0,
          };
        }),
      },
      { req }
    );
  }

  if (box === "out") {
    const rows = await dbAll(
      db,
      `SELECT i.id, i.to_uid, i.expires_at, u.username, s.name
       FROM pvp_invites i
       LEFT JOIN users u ON u.uid = i.to_uid
       LEFT JOIN scores s ON s.uid = i.to_uid
       WHERE i.from_uid = ? AND i.status = 'pending' AND i.expires_at > ?
       ORDER BY i.created_at DESC
       LIMIT 50`,
      [uid, now]
    );
    return json(
      {
        invites: rows.map((r) => ({
          id: Number(r.id),
          to_uid: r.to_uid,
          to_name: r.username || r.name || r.to_uid,
          expires_at: Number(r.expires_at) || 0,
        })),
      },
      { req }
    );
  }

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
