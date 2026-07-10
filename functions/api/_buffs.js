// Server buff pure helpers (mirrored from legacy worker)
export const SERVER_BUFF_KEYS = ["exp", "resProd", "resCap", "research", "capture", "aff"];
export const SERVER_BUFF_BUY_MAX_MINUTES = 30 * 24 * 60;
export const HOUR_SEC = 12 * 60 * 60;

/** Level from remaining seconds: 0 if empty; else 1..10 by 12h buckets */
export function buffLevel(remainingSec) {
  const s = Math.max(0, Math.floor(remainingSec || 0));
  if (s <= 0) return 0;
  return Math.min(10, 1 + Math.floor(s / HOUR_SEC));
}

export function decayedRemaining(row, now) {
  if (!row) return { rem: 0, ts: now };
  const rem0 = typeof row.remainingSec === "number" ? row.remainingSec : Number(row.remainingSec || 0);
  const ts0 = typeof row.updatedAt === "number" ? row.updatedAt : Number(row.updatedAt || now);
  const rem = Math.max(0, Math.floor(rem0));
  const ts = Math.floor(ts0) || now;
  if (rem <= 0) return { rem: 0, ts: now };
  const elapsed = Math.max(0, Math.floor((now - ts) / 1000));
  const rem2 = Math.max(0, rem - elapsed);
  return { rem: rem2, ts: now };
}

export function clampBuffKey(v) {
  const k = String(v || "");
  return SERVER_BUFF_KEYS.includes(k) ? k : null;
}

export async function ensureBuffRows(db, now, dbFirst, dbRun) {
  for (const key of SERVER_BUFF_KEYS) {
    const row = await dbFirst(db, "SELECT key FROM server_buffs WHERE key = ?", [key]);
    if (!row) {
      await dbRun(db, "INSERT INTO server_buffs(key, remainingSec, updatedAt) VALUES(?, 0, ?)", [key, now]);
    }
  }
}
