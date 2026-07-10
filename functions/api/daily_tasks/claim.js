import { requireUser } from "../../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs } from "../../_db.js";
import { clampUid } from "../../_uid.js";

const TASK_DEFS = [
  { id: "gather", target: 50 },
  { id: "catch", target: 5 },
  { id: "login", target: 1 },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  const uid = user?.uid || clampUid(new URL(req.url).searchParams.get("uid") || "");
  if (!uid) return json({ error: "unauthorized" }, { status: 401, req });

  const date = todayKey();
  const row = await dbFirst(
    db,
    "SELECT progress_json, claimed FROM daily_tasks_progress WHERE uid = ? AND date = ?",
    [uid, date]
  );
  if (row && Number(row.claimed)) {
    return json({ error: "ALREADY_CLAIMED" }, { req });
  }

  let progress = {};
  if (row?.progress_json) {
    try {
      progress = JSON.parse(row.progress_json) || {};
    } catch {
    }
  }
  if (!progress.login) progress.login = 1;

  const allDone = TASK_DEFS.every((t) => (Number(progress[t.id]) || 0) >= t.target);
  if (!allDone) return json({ error: "not complete" }, { status: 400, req });

  await dbRun(
    db,
    `INSERT INTO daily_tasks_progress(uid, date, progress_json, claimed, updated_at) VALUES(?, ?, ?, 1, ?)
     ON CONFLICT(uid, date) DO UPDATE SET claimed = 1, progress_json = excluded.progress_json, updated_at = excluded.updated_at`,
    [uid, date, JSON.stringify(progress), nowMs()]
  );

  return json({ ok: true }, { req });
}
