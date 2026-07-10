import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs } from "../_db.js";
import { clampUid } from "../_uid.js";

const TASK_DEFS = [
  { id: "gather", type: "gather", label: "采集 50 次", icon: "采", target: 50, reward: { catnip: 100 } },
  { id: "catch", type: "catch", label: "捕捉 5 只", icon: "捕", target: 5, reward: { pokeball: 3 } },
  { id: "login", type: "login", label: "今日登录", icon: "登", target: 1, reward: { futurecoin: 1 } },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function resolveUid(req, user) {
  if (user?.uid) return user.uid;
  const q = clampUid(new URL(req.url).searchParams.get("uid") || "");
  return q;
}

async function loadProgress(db, uid, date) {
  const row = await dbFirst(
    db,
    "SELECT progress_json, claimed FROM daily_tasks_progress WHERE uid = ? AND date = ?",
    [uid, date]
  );
  let progress = {};
  if (row?.progress_json) {
    try {
      progress = JSON.parse(row.progress_json) || {};
    } catch {
    }
  }
  // Auto-complete login task when endpoint is hit
  if (!progress.login) progress.login = 1;
  return { progress, claimed: Boolean(row?.claimed) };
}

function buildState(progress, claimed) {
  const tasks = TASK_DEFS.map((t) => {
    const current = Math.min(t.target, Math.max(0, Number(progress[t.id]) || 0));
    return {
      id: t.id,
      type: t.type,
      label: t.label,
      icon: t.icon,
      current,
      target: t.target,
      completed: current >= t.target,
      reward: t.reward,
    };
  });
  const isAllCompleted = tasks.every((t) => t.completed);
  const canClaim = isAllCompleted && !claimed;
  return { tasks, claimed, canClaim, isAllCompleted };
}

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "GET") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  const uid = resolveUid(req, user);
  if (!uid) return json({ error: "uid required" }, { status: 401, req });

  const date = todayKey();
  const { progress, claimed } = await loadProgress(db, uid, date);
  await dbRun(
    db,
    `INSERT INTO daily_tasks_progress(uid, date, progress_json, claimed, updated_at) VALUES(?, ?, ?, ?, ?)
     ON CONFLICT(uid, date) DO UPDATE SET progress_json = excluded.progress_json, updated_at = excluded.updated_at`,
    [uid, date, JSON.stringify(progress), claimed ? 1 : 0, nowMs()]
  );

  return json(buildState(progress, claimed), { req });
}
