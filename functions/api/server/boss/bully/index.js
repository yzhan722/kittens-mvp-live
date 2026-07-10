import { applyBossRegen, BOSS_KEY, BOSS_MAX_HP, parseRewards } from "../../../_boss.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs } from "../../../_db.js";
import { clampUid } from "../../../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "GET") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const now = nowMs();
  const url = new URL(req.url);
  const uid = clampUid(url.searchParams.get("uid") || "") || "";

  let row = await dbFirst(
    db,
    "SELECT key, hp, maxHp, killSeq, updatedAt, lastKillAt, rewardType, rewardQty, rewardJson FROM server_boss_state WHERE key = ?",
    [BOSS_KEY]
  );
  if (!row) {
    await dbRun(
      db,
      "INSERT INTO server_boss_state(key, hp, maxHp, killSeq, updatedAt, lastKillAt, rewardType, rewardQty, rewardJson) VALUES(?,?,?,?,?,?,?,?,?)",
      [BOSS_KEY, BOSS_MAX_HP, BOSS_MAX_HP, 0, now, 0, null, null, null]
    );
    row = await dbFirst(
      db,
      "SELECT key, hp, maxHp, killSeq, updatedAt, lastKillAt, rewardType, rewardQty, rewardJson FROM server_boss_state WHERE key = ?",
      [BOSS_KEY]
    );
  }

  const maxHp = Number(row.maxHp) || BOSS_MAX_HP;
  const regen = applyBossRegen(row.hp, maxHp, row.updatedAt, now);
  let hp = regen.hp;
  if (hp !== Number(row.hp) || regen.ts !== Number(row.updatedAt)) {
    await dbRun(db, "UPDATE server_boss_state SET hp = ?, updatedAt = ? WHERE key = ?", [hp, regen.ts, BOSS_KEY]);
  }

  const killSeq = Number(row.killSeq) || 0;
  let claimed = false;
  if (uid && killSeq > 0) {
    const claim = await dbFirst(
      db,
      "SELECT uid FROM server_boss_claims WHERE key = ? AND killSeq = ? AND uid = ?",
      [BOSS_KEY, killSeq, uid]
    );
    claimed = Boolean(claim);
  }

  const rewards = parseRewards(row.rewardJson, row.rewardType, row.rewardQty);
  const rewardType = row.rewardType || "";
  const rewardQty = Number(row.rewardQty) || 0;

  return json(
    {
      key: BOSS_KEY,
      hp,
      maxHp,
      killSeq,
      claimed,
      rewardType,
      rewardQty,
      rewards,
      lastKillAt: Number(row.lastKillAt) || 0,
    },
    { req }
  );
}
