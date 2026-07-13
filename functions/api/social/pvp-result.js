import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { checkRateLimit } from "../_rate_limit.js";
import { clampUid, intOr } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  const rl = await checkRateLimit(db, `social/pvp-result:${user.uid}`, { limit: 30, windowSec: 60 });
  if (!rl.ok) {
    return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }

  const body = await readJson(req);
  const inviteId = intOr(body?.inviteId, 0);
  const player1Uid = clampUid(body?.player1Uid);
  const player2Uid = clampUid(body?.player2Uid);
  const hasWinner = body != null && Object.prototype.hasOwnProperty.call(body, "winnerUid");
  const winnerUid = hasWinner ? clampUid(body.winnerUid) || null : undefined;
  const battleLog = body?.battleLog;
  if (!inviteId || !player1Uid || !player2Uid || !hasWinner || !Array.isArray(battleLog)) {
    return json({ error: "bad request" }, { status: 400, req });
  }

  const invite = await dbFirst(db, "SELECT from_uid, to_uid, status FROM pvp_invites WHERE id = ?", [inviteId]);
  if (!invite || (user.uid !== invite.from_uid && user.uid !== invite.to_uid)) {
    return json({ error: "invite not found" }, { status: 404, req });
  }
  if (player1Uid !== invite.from_uid || player2Uid !== invite.to_uid) {
    return json({ error: "players do not match invite" }, { status: 400, req });
  }
  if (invite.status !== "accepted") return json({ error: "invite not accepted" }, { status: 409, req });
  if (winnerUid && winnerUid !== player1Uid && winnerUid !== player2Uid) {
    return json({ error: "bad request" }, { status: 400, req });
  }
  const battleLogJson = JSON.stringify(battleLog);
  const existing = await dbFirst(db, "SELECT id FROM pvp_battles WHERE invite_id = ?", [inviteId]);
  if (existing) return json({ error: "result already recorded" }, { status: 409, req });

  await dbRun(
    db,
    "INSERT INTO pvp_battles(invite_id, player1_uid, player2_uid, winner_uid, battle_log, created_at) VALUES(?, ?, ?, ?, ?, ?)",
    [inviteId, player1Uid, player2Uid, winnerUid, battleLogJson, nowMs()]
  );
  return json({ ok: true }, { req });
}
