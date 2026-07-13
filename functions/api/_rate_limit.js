// D1-backed fixed-window rate limiter (one row per key)
import { dbFirst, dbRun, nowMs } from "./_db.js";

export async function checkRateLimit(db, key, { limit, windowSec }) {
  const now = nowMs();
  const windowMs = windowSec * 1000;
  const row = await dbFirst(db, "SELECT count, window_start FROM rate_limits WHERE key = ?", [key]);

  if (!row || now - Number(row.window_start) >= windowMs) {
    await dbRun(
      db,
      `INSERT INTO rate_limits(key, count, window_start) VALUES(?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start`,
      [key, now]
    );
    return { ok: true, retryAfterSec: 0 };
  }

  const count = Number(row.count) || 0;
  if (count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((Number(row.window_start) + windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  await dbRun(db, "UPDATE rate_limits SET count = count + 1 WHERE key = ?", [key]);
  return { ok: true, retryAfterSec: 0 };
}
