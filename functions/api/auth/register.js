import { createSession, hashPassword, newUid } from "../_auth.js";
import { dbFirst, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { clampUsername } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const body = await readJson(req);
  const username = clampUsername(body?.username);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username) return json({ error: "invalid username" }, { status: 400, req });
  if (password.length < 4 || password.length > 128) {
    return json({ error: "invalid password" }, { status: 400, req });
  }

  const db = getDb(context.env);
  const exists = await dbFirst(db, "SELECT id FROM users WHERE username = ?", [username]);
  if (exists) return json({ error: "username taken" }, { status: 409, req });

  const uid = newUid();
  const password_hash = await hashPassword(password);
  const created_at = nowMs();
  const ins = await db
    .prepare("INSERT INTO users(uid, username, password_hash, created_at) VALUES(?, ?, ?, ?)")
    .bind(uid, username, password_hash, created_at)
    .run();
  const userId = ins?.meta?.last_row_id;
  if (!userId) return json({ error: "register failed" }, { status: 500, req });

  const token = await createSession(db, userId);
  return json({ token, username, uid }, { req });
}
