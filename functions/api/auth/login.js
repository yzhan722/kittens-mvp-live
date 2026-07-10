import { createSession, verifyPassword } from "../_auth.js";
import { dbFirst, getDb, handleOptions, json, readJson } from "../_db.js";
import { clampUsername } from "../_uid.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const body = await readJson(req);
  const username = clampUsername(body?.username);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password) return json({ error: "invalid credentials" }, { status: 400, req });

  const db = getDb(context.env);
  const user = await dbFirst(db, "SELECT id, uid, username, password_hash FROM users WHERE username = ?", [
    username,
  ]);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json({ error: "invalid credentials" }, { status: 401, req });
  }

  const token = await createSession(db, user.id);
  return json({ token, username: user.username, uid: user.uid }, { req });
}
