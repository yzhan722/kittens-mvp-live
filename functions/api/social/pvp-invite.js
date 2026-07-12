import { requireUser } from "../_auth.js";
import { dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { clampUid } from "../_uid.js";

const TTL_MS = 24 * 60 * 60 * 1000;

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  const body = await readJson(req);
  const fromUid = user.uid;
  const toUid = clampUid(body?.toUid);
  const teamData = Array.isArray(body?.teamData) ? body.teamData : [];
  if (!toUid || toUid === fromUid) return json({ error: "bad request" }, { status: 400, req });

  const now = nowMs();
  await dbRun(
    db,
    "INSERT INTO pvp_invites(from_uid, to_uid, status, team_data, created_at, expires_at) VALUES(?, ?, 'pending', ?, ?, ?)",
    [fromUid, toUid, JSON.stringify(teamData), now, now + TTL_MS]
  );
  return json({ ok: true }, { req });
}
