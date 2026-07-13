import { requireUser } from "../_auth.js";
import { dbRun, getDb, handleOptions, json, nowMs } from "../_db.js";
import {
  clampDate,
  loadRow,
  parseProgress,
  streakSnapshot,
  validateTasksPayload,
  yesterdayOf,
} from "./index.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  let body = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const date = clampDate(body?.date);
  if (!date) return json({ error: "bad date" }, { status: 400, req });

  const tasks = body?.tasks;
  if (!validateTasksPayload(tasks)) {
    return json({ error: "invalid tasks" }, { status: 400, req });
  }

  const row = await loadRow(db, user.uid, date);
  if (row && Number(row.claimed)) {
    return json({ error: "ALREADY_CLAIMED" }, { status: 409, req });
  }

  const yesterday = yesterdayOf(date);
  let streakDays = 1;
  if (yesterday) {
    const yRow = await loadRow(db, user.uid, yesterday);
    if (yRow?.claimed) {
      const yp = parseProgress(yRow.progress_json);
      streakDays = Math.max(1, (Number(yp.streakDays) || 0) + 1);
    }
  }

  const progressJson = JSON.stringify({
    tasks: tasks.map((t) => ({
      type: t.type,
      current: Number(t.current) || 0,
      target: Number(t.target) || 0,
      completed: Boolean(t.completed),
    })),
    streakDays,
    claimedAt: nowMs(),
  });

  await dbRun(
    db,
    `INSERT INTO daily_tasks_progress(uid, date, progress_json, claimed, updated_at) VALUES(?, ?, ?, 1, ?)
     ON CONFLICT(uid, date) DO UPDATE SET progress_json = excluded.progress_json, claimed = 1, updated_at = excluded.updated_at`,
    [user.uid, date, progressJson, nowMs()]
  );

  const streak = await streakSnapshot(db, user.uid, date);

  return json(
    {
      ok: true,
      date,
      streak: {
        consecutiveDays: streak.consecutiveDays,
        lastClaimDate: streak.lastClaimDate,
      },
    },
    { req }
  );
}
