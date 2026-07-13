import { requireUser } from "../../_auth.js";
import { buffLevel, clampBuffKey, decayedRemaining, ensureBuffRows, SERVER_BUFF_BUY_MAX_MINUTES } from "../../_buffs.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../../_db.js";
import { checkRateLimit } from "../../_rate_limit.js";
import { clampName, intOr } from "../../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  const rl = await checkRateLimit(db, `buffs/buy:${user.uid}`, { limit: 30, windowSec: 60 });
  if (!rl.ok) {
    return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }

  const body = await readJson(req);
  const key = clampBuffKey(body?.key);
  const uid = user.uid;
  const name = clampName(body?.name);
  const addSec = Math.max(0, intOr(body?.addSec, 0));
  if (!key) return json({ error: "bad request" }, { status: 400, req });
  if (addSec < 60) return json({ error: "addSec too small" }, { status: 400, req });
  if (addSec > SERVER_BUFF_BUY_MAX_MINUTES * 60) {
    return json({ error: "over max minutes" }, { status: 422, req });
  }

  const now = nowMs();
  await ensureBuffRows(db, now, dbFirst, dbRun);

  const row = await dbFirst(db, "SELECT key, remainingSec, updatedAt FROM server_buffs WHERE key = ?", [key]);
  const { rem } = decayedRemaining(row, now);
  const rem2 = rem + addSec;
  await dbRun(db, "UPDATE server_buffs SET remainingSec = ?, updatedAt = ? WHERE key = ?", [rem2, now, key]);

  const prev = await dbFirst(db, "SELECT sec FROM server_buff_contrib WHERE key = ? AND uid = ?", [key, uid]);
  const sec0 = prev ? Number(prev.sec) || 0 : 0;
  await dbRun(
    db,
    `INSERT INTO server_buff_contrib(key, uid, name, sec, updatedAt) VALUES(?, ?, ?, ?, ?)
     ON CONFLICT(key, uid) DO UPDATE SET name = excluded.name, sec = excluded.sec, updatedAt = excluded.updatedAt`,
    [key, uid, name, sec0 + addSec, now]
  );

  return json({ ok: true, key, remainingSec: rem2, level: buffLevel(rem2) }, { req });
}
