import { requireUser } from "../_auth.js";
import { dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { checkRateLimit } from "../_rate_limit.js";
import { clampName, clampStr } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  const rl = await checkRateLimit(db, `events/push:${user.uid}`, { limit: 30, windowSec: 60 });
  if (!rl.ok) {
    return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }

  const body = await readJson(req);
  const type = clampStr(body?.type, 32) || "info";
  const uid = user.uid;
  const name = clampName(body?.name);
  const msg = clampStr(body?.msg, 200);
  if (!msg) return json({ ok: false, error: "empty msg" }, { status: 400, req });
  await dbRun(db, "INSERT INTO events(ts, type, uid, name, msg) VALUES(?, ?, ?, ?, ?)", [
    nowMs(),
    type,
    uid || null,
    name,
    msg,
  ]);
  return json({ ok: true }, { req });
}
