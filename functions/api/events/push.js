import { dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { clampName, clampStr, clampUid } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const body = await readJson(req);
  const type = clampStr(body?.type, 32) || "info";
  const uid = clampUid(body?.uid) || "";
  const name = clampName(body?.name);
  const msg = clampStr(body?.msg, 200);
  if (!msg) return json({ ok: false, error: "empty msg" }, { status: 400, req });

  const db = getDb(context.env);
  await dbRun(db, "INSERT INTO events(ts, type, uid, name, msg) VALUES(?, ?, ?, ?, ?)", [
    nowMs(),
    type,
    uid || null,
    name,
    msg,
  ]);
  return json({ ok: true }, { req });
}
