import { dbRun, getDb, handleOptions, json, nowMs, readJson } from "../../_db.js";
import { clampUid, intOr } from "../../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const body = await readJson(req);
  const inviteId = intOr(body?.inviteId, 0);
  const player1Uid = clampUid(body?.player1Uid);
  const player2Uid = clampUid(body?.player2Uid);
  const winnerUid = clampUid(body?.winnerUid) || null;
  const battleLog = body?.battleLog != null ? JSON.stringify(body.battleLog) : null;
  if (!inviteId || !player1Uid || !player2Uid) return json({ error: "bad request" }, { status: 400, req });

  const db = getDb(context.env);
  await dbRun(
    db,
    "INSERT INTO pvp_battles(invite_id, player1_uid, player2_uid, winner_uid, battle_log, created_at) VALUES(?, ?, ?, ?, ?, ?)",
    [inviteId, player1Uid, player2Uid, winnerUid, battleLog, nowMs()]
  );
  return json({ ok: true }, { req });
}
