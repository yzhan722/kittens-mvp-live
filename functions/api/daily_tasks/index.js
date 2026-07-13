import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs } from "../_db.js";

// ponytail: task generation + progress stay client-local; server stores claim + streak only (upgrade = full progress sync)

export function clampDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function yesterdayOf(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function parseProgress(json) {
  try {
    return JSON.parse(json) || {};
  } catch {
    return {};
  }
}

export function validateTasksPayload(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return false;
  let hasCompleted = false;
  for (const t of tasks) {
    if (!t || typeof t.type !== "string") return false;
    const target = Number(t.target);
    const current = Number(t.current);
    if (!Number.isFinite(target) || target <= 0) return false;
    if (!Number.isFinite(current) || current < 0 || current > target) return false;
    if (t.completed) {
      if (current < target) return false;
      hasCompleted = true;
    }
  }
  return hasCompleted;
}

export async function loadRow(db, uid, date) {
  return dbFirst(
    db,
    "SELECT progress_json, claimed FROM daily_tasks_progress WHERE uid = ? AND date = ?",
    [uid, date]
  );
}

export async function streakSnapshot(db, uid, date) {
  const todayRow = await loadRow(db, uid, date);
  const yesterday = yesterdayOf(date);
  const yRow = yesterday ? await loadRow(db, uid, yesterday) : null;

  let consecutiveDays = 0;
  let lastClaimDate = "";

  if (todayRow?.claimed) {
    const p = parseProgress(todayRow.progress_json);
    consecutiveDays = Math.max(1, Number(p.streakDays) || 1);
    lastClaimDate = date;
  } else if (yRow?.claimed) {
    const p = parseProgress(yRow.progress_json);
    consecutiveDays = Math.max(0, Number(p.streakDays) || 0);
    lastClaimDate = yesterday;
  }

  return { consecutiveDays, lastClaimDate, claimedToday: Boolean(todayRow?.claimed) };
}

function tasksFromProgress(row) {
  const p = parseProgress(row?.progress_json);
  return Array.isArray(p.tasks) ? p.tasks : [];
}

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "GET") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  const url = new URL(req.url);
  const date = clampDate(url.searchParams.get("date")) || new Date().toISOString().slice(0, 10);
  const row = await loadRow(db, user.uid, date);
  const streak = await streakSnapshot(db, user.uid, date);

  return json(
    {
      date,
      claimed: Boolean(row?.claimed),
      streak: {
        consecutiveDays: streak.consecutiveDays,
        lastClaimDate: streak.lastClaimDate,
      },
      tasks: tasksFromProgress(row),
    },
    { req }
  );
}
