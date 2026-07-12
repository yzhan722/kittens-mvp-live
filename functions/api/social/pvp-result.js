import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { clampUid, intOr } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  const body = await readJson(req);
  const inviteId = intOr(body?.inviteId, 0);
  const winnerUid = clampUid(body?.winnerUid) || null;
  const battleLog = body?.battleLog != null ? JSON.stringify(body.battleLog) : null;
  if (!inviteId) return json({ error: "bad request" }, { status: 400, req });

  const invite = await dbFirst(db, "SELECT from_uid, to_uid, status FROM pvp_invites WHERE id = ?", [inviteId]);
  if (!invite || (user.uid !== invite.from_uid && user.uid !== invite.to_uid)) {
    return json({ error: "invite not found" }, { status: 404, req });
  }
  if (invite.status !== "accepted") return json({ error: "invite not accepted" }, { status: 409, req });
  const player1Uid = invite.from_uid;
  const player2Uid = invite.to_uid;
  if (winnerUid && winnerUid !== player1Uid && winnerUid !== player2Uid) {
    return json({ error: "bad request" }, { status: 400, req });
  }
  const existing = await dbFirst(db, "SELECT id FROM pvp_battles WHERE invite_id = ?", [inviteId]);
  if (existing) return json({ error: "result already recorded" }, { status: 409, req });

  await dbRun(
    db,
    "INSERT INTO pvp_battles(invite_id, player1_uid, player2_uid, winner_uid, battle_log, created_at) VALUES(?, ?, ?, ?, ?, ?)",
    [inviteId, player1Uid, player2Uid, winnerUid, battleLog, nowMs()]
  );
  return json({ ok: true }, { req });
}
