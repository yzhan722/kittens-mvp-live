import {
  applyBossRegen,
  BOSS_KEY,
  BOSS_MAX_HP,
  bossAttackDamage,
  buildBossRewards,
  parseRewards,
} from "../../../_boss.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../../../_db.js";
import { clampName, clampUid } from "../../../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const body = await readJson(req);
  const uid = clampUid(body?.uid);
  if (!uid) return json({ error: "uid required" }, { status: 400, req });
  clampName(body?.name);

  const db = getDb(context.env);
  const now = nowMs();
  let row = await dbFirst(
    db,
    "SELECT hp, maxHp, killSeq, updatedAt, rewardType, rewardQty, rewardJson FROM server_boss_state WHERE key = ?",
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
      "SELECT hp, maxHp, killSeq, updatedAt, rewardType, rewardQty, rewardJson FROM server_boss_state WHERE key = ?",
      [BOSS_KEY]
    );
  }

  const maxHp = Number(row.maxHp) || BOSS_MAX_HP;
  const regen = applyBossRegen(row.hp, maxHp, row.updatedAt, now);
  let hp = regen.hp;
  const dmg = bossAttackDamage(maxHp);
  hp = Math.max(0, hp - dmg);
  let killed = false;
  let killSeq = Number(row.killSeq) || 0;
  let rewardType = row.rewardType;
  let rewardQty = row.rewardQty;
  let rewardJson = row.rewardJson;

  if (hp <= 0) {
    killed = true;
    killSeq += 1;
    const rewards = buildBossRewards();
    rewardJson = JSON.stringify(rewards);
    const firstKey = Object.keys(rewards)[0] || "futurecoin";
    rewardType = firstKey;
    rewardQty = rewards[firstKey] || 0;
    hp = maxHp;
    await dbRun(
      db,
      "UPDATE server_boss_state SET hp = ?, maxHp = ?, killSeq = ?, updatedAt = ?, lastKillAt = ?, rewardType = ?, rewardQty = ?, rewardJson = ? WHERE key = ?",
      [hp, maxHp, killSeq, now, now, rewardType, rewardQty, rewardJson, BOSS_KEY]
    );
  } else {
    await dbRun(db, "UPDATE server_boss_state SET hp = ?, updatedAt = ? WHERE key = ?", [hp, now, BOSS_KEY]);
  }

  return json(
    {
      key: BOSS_KEY,
      hp,
      maxHp,
      killed,
      killSeq,
      damage: dmg,
      rewards: killed ? parseRewards(rewardJson, rewardType, rewardQty) : {},
    },
    { req }
  );
}
