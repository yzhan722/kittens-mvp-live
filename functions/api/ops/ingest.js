import { requireUser } from "../_auth.js";
import { dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { checkRateLimit } from "../_rate_limit.js";
import { clampStr, clampUid } from "../_uid.js";

const MAX_EVENTS = 50;
const ALLOWED_EVENTS = new Set([
  "session_start",
  "gather_click",
  "first_capture",
  "daily_claim",
  "futurecoin_spend",
]);

function clientIp(req) {
  const cf = req.headers.get("CF-Connecting-IP");
  if (cf) return cf.slice(0, 64);
  const xff = req.headers.get("X-Forwarded-For");
  if (xff) return xff.split(",")[0].trim().slice(0, 64);
  return "unknown";
}

function sanitizeProps(props) {
  if (!props || typeof props !== "object" || Array.isArray(props)) return {};
  const out = {};
  let n = 0;
  for (const [k, v] of Object.entries(props)) {
    if (n >= 20) break;
    const key = clampStr(k, 32);
    if (!key || !/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(key)) continue;
    if (v == null) continue;
    if (typeof v === "string") out[key] = clampStr(v, 200);
    else if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
    else if (typeof v === "boolean") out[key] = v;
    n += 1;
  }
  return out;
}

function normalizeEvents(body) {
  const raw = Array.isArray(body?.events) ? body.events : [];
  const out = [];
  for (const item of raw.slice(0, MAX_EVENTS)) {
    const event = clampStr(item?.event, 64);
    if (!event || !ALLOWED_EVENTS.has(event)) continue;
    const ts0 = Number(item?.ts);
    const ts = Number.isFinite(ts0) ? Math.max(0, Math.floor(ts0)) : nowMs();
    out.push({
      event,
      ts,
      sessionId: clampStr(item?.sessionId, 64) || "",
      uid: clampUid(item?.uid) || "",
      props: sanitizeProps(item?.props),
      gameVersion: clampStr(item?.gameVersion, 32) || "",
    });
  }
  return out;
}

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const body = await readJson(req);
  const events = normalizeEvents(body);
  if (events.length === 0) return json({ ok: false, error: "no events" }, { status: 400, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  const ip = clientIp(req);
  const rlKey = user ? `ops/ingest:uid:${user.uid}` : `ops/ingest:ip:${ip}`;
  const rl = await checkRateLimit(db, rlKey, { limit: user ? 120 : 60, windowSec: 60 });
  if (!rl.ok) {
    return json({ error: "rate limit exceeded", retryAfterSec: rl.retryAfterSec }, { status: 429, req });
  }

  const createdAt = nowMs();
  for (const e of events) {
    const uid = user?.uid || e.uid || null;
    await dbRun(
      db,
      "INSERT INTO analytics_events(ts, event, uid, session_id, props_json, created_at) VALUES(?, ?, ?, ?, ?, ?)",
      [e.ts, e.event, uid, e.sessionId || null, JSON.stringify({ ...e.props, gameVersion: e.gameVersion || undefined }), createdAt]
    );
  }

  return json({ ok: true, accepted: events.length }, { req });
}
