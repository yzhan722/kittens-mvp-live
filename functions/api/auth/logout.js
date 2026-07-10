import { bearerToken, destroySession } from "../_auth.js";
import { getDb, handleOptions, json } from "../_db.js";

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const token = bearerToken(req);
  await destroySession(db, token);
  return json({ ok: true }, { req });
}
