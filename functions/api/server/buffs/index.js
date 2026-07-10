import { buffLevel, decayedRemaining, ensureBuffRows, SERVER_BUFF_KEYS } from "../../_buffs.js";
import { dbAll, dbFirst, dbRun, getDb, handleOptions, json, nowMs } from "../../_db.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "GET") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const now = nowMs();
  await ensureBuffRows(db, now, dbFirst, dbRun);

  const items = [];
  for (const key of SERVER_BUFF_KEYS) {
    const row = await dbFirst(db, "SELECT key, remainingSec, updatedAt FROM server_buffs WHERE key = ?", [key]);
    const { rem, ts } = decayedRemaining(row, now);
    if (row && rem !== Number(row.remainingSec)) {
      await dbRun(db, "UPDATE server_buffs SET remainingSec = ?, updatedAt = ? WHERE key = ?", [rem, ts, key]);
    }
    const contrib = await dbAll(
      db,
      "SELECT uid, name, sec FROM server_buff_contrib WHERE key = ? ORDER BY sec DESC LIMIT 10",
      [key]
    );
    items.push({
      key,
      level: buffLevel(rem),
      remainingSec: rem,
      contributors: contrib.map((c) => ({
        uid: c.uid,
        name: c.name,
        sec: Number(c.sec) || 0,
      })),
    });
  }

  return json({ items, ts: now }, { req });
}
