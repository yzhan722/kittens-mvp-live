import { requireUser } from "../../../_auth.js";
import { BOSS_KEY, parseRewards } from "../../../_boss.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../../../_db.js";
import { clampName } from "../../../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  const body = await readJson(req);
  const uid = user.uid;
  clampName(body?.name);
  const now = nowMs();
  const row = await dbFirst(
    db,
    "SELECT killSeq, rewardType, rewardQty, rewardJson FROM server_boss_state WHERE key = ?",
    [BOSS_KEY]
  );
  const killSeq = Number(row?.killSeq) || 0;
  if (killSeq <= 0) {
    return json({ alreadyClaimed: true, rewardType: "", rewardQty: 0, rewards: {} }, { req });
  }

  const existing = await dbFirst(
    db,
    "SELECT uid FROM server_boss_claims WHERE key = ? AND killSeq = ? AND uid = ?",
    [BOSS_KEY, killSeq, uid]
  );
  if (existing) {
    return json(
      {
        key: BOSS_KEY,
        killSeq,
        alreadyClaimed: true,
        rewardType: "",
        rewardQty: 0,
        rewards: {},
      },
      { req }
    );
  }

  await dbRun(db, "INSERT INTO server_boss_claims(key, killSeq, uid, claimedAt) VALUES(?, ?, ?, ?)", [
    BOSS_KEY,
    killSeq,
    uid,
    now,
  ]);

  const rewards = parseRewards(row.rewardJson, row.rewardType, row.rewardQty);
  const rewardType = row.rewardType || "";
  const rewardQty = Number(row.rewardQty) || 0;

  return json(
    {
      key: BOSS_KEY,
      killSeq,
      alreadyClaimed: false,
      rewardType,
      rewardQty,
      rewards,
    },
    { req }
  );
}
